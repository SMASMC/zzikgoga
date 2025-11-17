package com.zzik.backend.global.external.bank.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * 은행 API 설정
 * <p>
 * application.yml의 external.bank 설정을 매핑
 * </p>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "external.bank")
public class BankApiConfig {
	/** 은행 API base URL */
	private String baseUrl;

	/** API 엔드포인트 URI */
	private Uris uris;

	/** API 인증 정보 */
	private Credentials credentials;

	/** 서비스 계좌 정보 */
	private Account account;

	/** 거래 요약 문구 */
	private SummaryTexts summaryTexts;

	@Getter
	@Setter
	public static class Uris {
		/** 계좌 이체 URI */
		private String transfer;
		/** 이체 내역 조회 URI */
		private String transferList;
	}

	@Getter
	@Setter
	public static class Credentials {
		/** API 키 (app-key) */
		private String appKey;
		/** 사용자 키 (user-key) */
		private String userKey;
	}

	@Getter
	@Setter
	public static class Account {
		/** 서비스 계좌번호 */
		private String number;
		/** 은행 번호 */
		private String bankNumber;
	}

	@Getter
	@Setter
	public static class SummaryTexts {
		/** 계좌 이체 관련 요약 문구 */
		private TransferSummary transfer;
	}

	@Getter
	@Setter
	public static class TransferSummary {
		/** 입금 계좌 거래 요약 문구 */
		private String deposit;
		/** 출금 계좌 거래 요약 문구 */
		private String withdrawal;
	}
}
