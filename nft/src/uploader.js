// src/uploader.js
import { Uploader } from "@irys/upload";
import { Matic } from "@irys/upload-ethereum";
import "dotenv/config";

let cachedClient = null;

/** Irys Client */
// TEST
async function getClient() {
  if (cachedClient) return cachedClient;

  const pk = process.env.WALLET_PRIVATE_KEY;
  if (!pk) throw new Error("WALLET_PRIVATE_KEY missing");

  // ⭐ Irys 공식 영구 저장 모드 초기화
  const client = await Uploader(Matic, {
    providerUrl: process.env.POLYGON_RPC_URL,   // 반드시 추가해야 함
    timeout: 120000,      // 120초
    minConfirm: 1,        // confirmation 1회
    gasMultiplier: 1.2    // gas 부족 방지
  }).withWallet(pk);

  if (client.ready) {
    await client.ready();
  }

  cachedClient = client;
  return client;
}


async function ensureFundingConfirmed(irys, txId) {
  for (let i = 0; i < 60; i++) {
    try {
      const status = await irys.getTransaction(txId);
      if (status && status.finalized) {
        console.log("💸 Funding confirmed");
        return;
      }
    } catch (_) { }
    await new Promise(res => setTimeout(res, 3000));
  }
  console.log("⚠ Funding not fully confirmed, continuing anyway…");
}

async function waitForBalanceIncrease(irys, previousBalance) {
  for (let i = 0; i < 60; i++) {
    const balanceRaw = await irys.getBalance(irys.address);
    const balance = BigInt(balanceRaw.toString());

    if (balance > previousBalance) {
      console.log("💰 Balance updated:", balance);
      return true;
    }
    await new Promise(res => setTimeout(res, 3000));
  }
  console.log("⚠ Balance did not update");
  return false;
}

/**
 * 다양한 타입을 BigInt로 변환하는 안전 함수
 * number, string, bigint, BN(object) 모두 지원
 */
function toBigIntSafe(value) {
  if (value === null || value === undefined) {
    throw new Error("Cannot convert null/undefined to BigInt");
  }

  // 이미 BigInt
  if (typeof value === "bigint") return value;

  // number
  if (typeof value === "number") return BigInt(value);

  // string
  if (typeof value === "string") {
    return BigInt(value);
  }

  // object (BN, BigNumber 등)
  if (typeof value === "object") {
    // 1) value.toString() 이 있으면 그걸 사용
    if (typeof value.toString === "function") {
      return BigInt(value.toString());
    }

    // 2) value._hex 또는 value.hex 등 내부 값이 있으면 사용
    if (value._hex) {
      return BigInt(value._hex);
    }

    throw new Error("Unsupported object type for BigInt conversion");
  }

  throw new Error("Unsupported type for BigInt conversion: " + typeof value);
}

/**
 * 부족하면 자동 Funding
 */
async function autoFund(irys, sizeInBytes) {
  // Irys SDK는 price = BN 객체 반환 가능
  const priceRaw = await irys.getPrice(sizeInBytes);
  const price = toBigIntSafe(priceRaw);

  // getBalance 또한 BN-like object 반환 가능
  const balanceRaw = await irys.getBalance(irys.address);
  const balance = toBigIntSafe(balanceRaw);

  console.log(`💰 balance = ${balance}, price = ${price}`);

  if (balance < price) {
    const needed = (price - balance);
    console.log(`💸 Funding needed: ${needed}`);

    const fundRes = await irys.fund(needed * 5n);
    await ensureFundingConfirmed(irys, fundRes.id)
    await waitForBalanceIncrease(irys, balance)
    console.log(`💸 Funding executed: tx = ${fundRes.id}`);
  } else {
    console.log("💰 Funding not needed.");
  }
}

/**
 * PDF 업로드
 */
// export async function uploadPdf(buffer, originalName) {
//   const irys = await getClient();

//   await autoFund(irys, buffer.length);

//   const receipt = await irys.upload(buffer, {
//     tags: [
//       { name: "Content-Type", value: "application/pdf" },
//       { name: "File-Name", value: originalName },
//       { name: "App-Name", value: "zzik-travel-memory" },
//     ],
//   });

//   return {
//     id: receipt.id,
//     url: `https://gateway.irys.xyz/${receipt.id}`,
//   };
// }

/**
 * PDF 업로드 + Thumbnail 생성 & 업로드
 */
export async function uploadPdf(buffer, originalName) {
  const irys = await getClient();

  await autoFund(irys, buffer.length);

  // 1) PDF 업로드
  const pdfReceipt = await irys.upload(buffer, {
    upload: {
      bundle: true,     // bundling
      anchor: true      // ⭐ Arweave에 영구 저장하도록 강제!
    },
    tags: [
      { name: "Content-Type", value: "application/pdf" },
      { name: "File-Name", value: originalName },
      { name: "App-Name", value: "zzik-travel-memory" },
    ],
  });

  // await irys.anchor(pdfReceipt.id);

  const pdfId = pdfReceipt.id;
  const pdfUrl = `https://gateway.irys.xyz/${pdfId}`;
  console.log(pdfReceipt.signature);

  // await irys.anchor(thumbReceipt.id);

  const thumbnailId = 1;
  const thumbnailUrl = `https://zzik-public.s3.ap-northeast-2.amazonaws.com/zzikzzik.png`;

  return {
    id: pdfId,
    url: pdfUrl,
    thumbnailId,
    thumbnailUrl
  };
}


/**
 * JSON Metadata 업로드
 */
export async function uploadMetadata(jsonString) {
  const irys = await getClient();

  await autoFund(irys, jsonString.length);

  const receipt = await irys.upload(jsonString, {
    upload: {
      bundle: true,     // bundling
      anchor: true      // ⭐ Arweave에 영구 저장하도록 강제!
    },
    tags: [
      { name: "Content-Type", value: "application/json" },
      { name: "App-Name", value: "zzik-travel-memory" },
    ],
  });

  // await irys.anchor(receipt.id);

  return {
    id: receipt.id,
    url: `https://gateway.irys.xyz/${receipt.id}`,
  };
}