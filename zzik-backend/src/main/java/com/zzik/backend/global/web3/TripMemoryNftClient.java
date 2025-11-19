package com.zzik.backend.global.web3;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.gas.StaticGasProvider;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class TripMemoryNftClient {

	private final Web3j web3j;
	private final Credentials credentials;
	private final String contractAddress;

	private long chainId = 137;

	public TripMemoryNftClient(
		@Value("${polygon.rpc.url}") String rpcUrl,
		@Value("${nft.wallet.privatekey}") String privateKey,
		@Value("${nft.contract.address}") String contractAddress
	) {
		this.web3j = Web3j.build(new HttpService(rpcUrl));
		this.credentials = Credentials.create(privateKey);
		this.contractAddress = contractAddress;
	}

	public void mintForGroup(String tripId, List<String> recipients, String metadataUri) {

		try {
			System.out.println("### MINT REQUEST ###");
			System.out.println("TripId: " + tripId);
			System.out.println("Recipients: " + recipients);
			System.out.println("TokenURI: " + metadataUri);

			BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
			BigInteger gasLimit = BigInteger.valueOf(500_000);

			RawTransactionManager txManager =
				new RawTransactionManager(web3j, credentials, chainId);
			StaticGasProvider gasProvider =
				new StaticGasProvider(gasPrice, gasLimit);

			TripMemoryNFT contract =
				TripMemoryNFT.load(contractAddress, web3j, txManager, gasProvider);

			// ⭐ MUST use .send()
			TransactionReceipt receipt =
				contract.mintForGroup(tripId, recipients, metadataUri);

			System.out.println("### MINT SUCCESS ###");
			System.out.println("TxHash: " + receipt.getTransactionHash());

		} catch (Exception e) {
			throw new RuntimeException("NFT mint failed: " + e.getMessage(), e);
		}
	}

	public boolean checkOwnership(String ownerAddress, String tripId) {
		try {
			TripMemoryNFT contract = TripMemoryNFT.load(
				contractAddress, web3j,
				new RawTransactionManager(web3j, credentials, chainId),
				new StaticGasProvider(
					web3j.ethGasPrice().send().getGasPrice(),
					BigInteger.valueOf(500_000)
				)
			);

			return contract.ownsTripToken(ownerAddress, tripId).send();

		} catch (Exception e) {
			log.info("❌ NFT Ownership check failed: {}", e.getMessage());
			return false;
		}
	}


}
