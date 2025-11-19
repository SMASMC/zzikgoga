// src/server.js
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import { uploadPdf, uploadMetadata } from "./uploader.js";

const app = express();

// JSON body 키우기
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// PDF 업로드를 위한 multer (메모리 사용)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "nft-uploader",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  res.status(200).json({
    service: "NFT Uploader Service",
    version: "1.0.0",
    endpoints: ["/upload/pdf", "/upload/json", "/health"],
  });
});

/**
 * 1) PDF 업로드 API
 * SpringBoot에서는 이걸 먼저 호출함
 */
app.post("/upload/pdf", upload.single("file"), async (req, res) => {
  try {
    console.log("📥 [Node] /upload/pdf 호출됨");

    if (!req.file) {
      console.log("❌ req.file 없음");
      return res.status(400).json({ ok: false, error: "file required" });
    }

    console.log("📄 업로드 파일:", req.file.originalname, req.file.size);

    const buffer = req.file.buffer;
    const originalName = req.file.originalname;

    const pdfResult = await uploadPdf(buffer, originalName);

    console.log("📦 PDF 업로드 성공:", pdfResult);

    const response = {
      ok: true,
      pdfId: pdfResult.id,
      pdfUrl: pdfResult.url,
      thumbnailId: pdfResult.thumbnailId,
      thumbnailUrl: pdfResult.thumbnailUrl,
    };

    console.log("📤 PDF Response sent:", response);

    return res.json(response);

  } catch (err) {
    console.error("❌ PDF Upload Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


/**
 * 2) JSON Metadata 업로드 API
 * SpringBoot가 pdfUrl을 포함한 JSON metadata를 보내줌
 */
app.post("/upload/json", async (req, res) => {
  try {
    console.log("📥 [Node] /upload/json 호출됨");
    console.log("📦 metadata:", req.body);

    const metadata = req.body;

    const jsonString = JSON.stringify(metadata);

    const metaResult = await uploadMetadata(jsonString);

    console.log("📦 metadata uploaded:", metaResult);

    const response = {
      ok: true,
      metadataId: metaResult.id,
      metadataUrl: metaResult.url,
      tokenURI: metaResult.url,
    };

    console.log("📤 Response sent:", response);

    return res.json(response);
  } catch (err) {
    console.error("❌ JSON Upload Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


// 서버 구동
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Uploader server on :${PORT}`));