package com.zzik.backend.global.config.web3;

import java.math.BigInteger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;

@Configuration
public class Web3Config {

	@Value("${polygon.rpc.url}")
	private String rpcUrl;

	@Value("${nft.wallet.privatekey}")
	private String privateKey;

	@Value("${polygon.chain-id}")
	private long chainId;

	@Bean
	public Web3j web3j() {
		return Web3j.build(new HttpService(rpcUrl));
	}

	@Bean
	public Credentials credentials() {
		// 서비스 민터 지갑 (메타마스크 private key)
		return Credentials.create(privateKey);
	}

	@Bean(name = "web3TransactionManager")
	public TransactionManager web3TransactionManager(Web3j web3j, Credentials credentials) {
		// RawTransactionManager: 로컬에서 사인 후 브로드캐스트
		return new RawTransactionManager(web3j, credentials, chainId);
	}

	@Bean
	public BigInteger gasPrice() {
		// 기본 가스 가격 (25 gwei). 테스트넷용, 나중에 동적으로 읽어도 됨.
		return BigInteger.valueOf(25_000_000_000L);
	}

	@Bean
	public BigInteger gasLimit() {
		// 넉넉히 5,000,000 정도 (컨트랙트 호출이 실패하진 않음)
		return BigInteger.valueOf(5_000_000L);
	}
}


