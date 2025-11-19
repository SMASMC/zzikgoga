package com.zzik.backend.global.external.bank;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.zzik.backend.global.external.bank.config.BankApiConfig;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 은행 API 타입 ENUM
 * <p>
 * application.yml의 external.bank.uris와 매핑됩니다.
 * </p>
 */
@Getter
@RequiredArgsConstructor
public enum BankApiType {
	/** 계좌 이체 API */
	TRANSFER("transfer"),

	/** 이체 내역 조회 API */
	TRANSFER_LIST("transferList");

	/** application.yml의 uris 키 (transfer, transferList 등) */
	private final String uriKey;

	// Spring Bean을 ENUM에 주입하기 위한 Holder
	private static BankApiConfig config;

	/**
	 * application.yml에서 설정된 전체 URI를 가져옵니다.
	 *
	 * @return 전체 URI (예: /edu/demandDeposit/updateDemandDepositAccountTransfer)
	 */
	public String getFullUri() {
		return switch (this) {
			case TRANSFER -> config.getUris().getTransfer();
			case TRANSFER_LIST -> config.getUris().getTransferList();
		};
	}

	/**
	 * URI에서 마지막 path명을 추출합니다.
	 * <p>
	 * 예: /edu/demandDeposit/updateDemandDepositAccountTransfer
	 * → updateDemandDepositAccountTransfer
	 * </p>
	 *
	 * @return API 이름 (URI의 마지막 path명)
	 */
	public String getApiName() {
		String fullUri = getFullUri();
		if (fullUri == null || fullUri.isEmpty()) {
			throw new IllegalStateException("URI is not configured for " + this.name());
		}

		// '/'를 기준으로 split하여 마지막 부분 추출
		String[] parts = fullUri.split("/");
		return parts[parts.length - 1];
	}

	/**
	 * BankApiConfig의 credentials를 반환합니다.
	 */
	public static BankApiConfig.Credentials getCredentials() {
		return config.getCredentials();
	}

	/**
	 * BankApiConfig의 transfer summary를 반환합니다.
	 */
	public static BankApiConfig.TransferSummary getTransferSummary() {
		return config.getSummaryTexts().getTransfer();
	}

	/**
	 * BankApiConfig의 account를 반환합니다.
	 */
	public static BankApiConfig.Account getAccount() {
		return config.getAccount();
	}

	/**
	 * ENUM에 BankApiConfig를 주입하기 위한 내부 컴포넌트
	 */
	@Component
	static class BankApiTypeConfigInjector {
		@Autowired
		public void setConfig(BankApiConfig bankApiConfig) {
			BankApiType.config = bankApiConfig;
		}
	}
}
