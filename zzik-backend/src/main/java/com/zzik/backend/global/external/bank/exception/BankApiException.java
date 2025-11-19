package com.zzik.backend.global.external.bank.exception;

import lombok.Getter;

/**
 * 은행 API 호출 시 발생하는 예외
 * <p>
 * RuntimeException을 상속받아 외부 API 오류를 처리합니다.
 * </p>
 */
@Getter
public class BankApiException extends RuntimeException {
	/** 에러 코드 ENUM */
	private final BankErrorCode errorCode;

	/** 외부 API의 원본 응답 메시지 */
	private final String apiResponseMessage;

	/**
	 * BankErrorCode와 API 응답 메시지로 예외를 생성합니다.
	 *
	 * @param errorCode 에러 코드 ENUM
	 * @param apiResponseMessage 외부 API의 원본 응답 메시지
	 */
	public BankApiException(BankErrorCode errorCode, String apiResponseMessage) {
		super(buildMessage(errorCode, apiResponseMessage));
		this.errorCode = errorCode;
		this.apiResponseMessage = apiResponseMessage;
	}

	/**
	 * 원인(cause)을 포함한 예외를 생성합니다.
	 *
	 * @param errorCode 에러 코드 ENUM
	 * @param apiResponseMessage 외부 API의 원본 응답 메시지
	 * @param cause 원인 예외
	 */
	public BankApiException(BankErrorCode errorCode, String apiResponseMessage, Throwable cause) {
		super(buildMessage(errorCode, apiResponseMessage), cause);
		this.errorCode = errorCode;
		this.apiResponseMessage = apiResponseMessage;
	}

	/**
	 * 예외 메시지를 생성합니다.
	 */
	private static String buildMessage(BankErrorCode errorCode, String apiResponseMessage) {
		return String.format("[%s] %s - API 응답: %s",
			errorCode.getCode(),
			errorCode.getMessage(),
			apiResponseMessage != null ? apiResponseMessage : "없음");
	}

	/**
	 * 재시도 가능한 오류인지 확인합니다.
	 *
	 * @return 재시도 가능하면 true
	 */
	public boolean isRetryable() {
		return errorCode.isRetryable();
	}

	/**
	 * 에러 코드 문자열을 반환합니다.
	 */
	public String getErrorCodeString() {
		return errorCode.getCode();
	}
}