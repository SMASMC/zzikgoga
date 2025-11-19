package com.zzik.backend.global.external.bank.exception;

import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 은행 API 응답 코드 ENUM
 * <p>
 * 외부 은행 API의 responseCode를 매핑합니다.
 * </p>
 */
@Getter
@RequiredArgsConstructor
public enum BankErrorCode {
	// ===== 계좌/거래 관련 에러 (A로 시작) =====
	/** 계좌 잔액 부족 */
	INSUFFICIENT_BALANCE("A1014", "계좌 잔액이 부족하여 거래가 실패했습니다.", false),

	/** 1회 이체 한도 초과 */
	TRANSFER_LIMIT_ONCE("A1016", "이체 가능 한도 초과(1회)", false),

	/** 1일 이체 한도 초과 */
	TRANSFER_LIMIT_DAILY("A1017", "이체 가능 한도 초과(1일)", false),

	/** 거래요약내용 길이 초과 */
	SUMMARY_LENGTH_EXCEEDED("A1018", "거래요약내용 길이가 초과되었습니다.", false),

	/** 계좌번호 유효하지 않음 */
	INVALID_ACCOUNT("A1003", "계좌번호가 유효하지 않습니다.", false),

	/** 거래금액 유효하지 않음 */
	INVALID_AMOUNT("A1011", "거래금액이 유효하지 않습니다.", false),

	// ===== 요청 형식 에러 (Q로 시작) =====
	/** 일반 에러 */
	GENERAL_ERROR("Q1000", "그 이외에 에러 메시지", false),

	/** 요청 본문 형식 오류 */
	INVALID_REQUEST_FORMAT("Q1001", "요청 본문의 형식이 잘못되었습니다. JSON 형식 또는 데이터 타입을 확인해 주세요.", false),

	// ===== 헤더 관련 에러 (H로 시작) =====
	/** 헤더 정보 유효하지 않음 */
	INVALID_HEADER("H1000", "HEADER 정보가 유효하지 않습니다.", false),

	/** API 이름 유효하지 않음 */
	INVALID_API_NAME("H1001", "API 이름이 유효하지 않습니다.", false),

	/** 전송일자 형식 오류 */
	INVALID_TRANSMISSION_DATE("H1002", "전송일자 형식이 유효하지 않습니다.", false),

	/** 전송시각 형식 오류 */
	INVALID_TRANSMISSION_TIME("H1003", "전송시각 형식이 유효하지 않습니다.", false),

	/** 기관코드 유효하지 않음 */
	INVALID_INSTITUTION_CODE("H1004", "기관코드가 유효하지 않습니다.", false),

	/** 핀테크 앱 일련번호 유효하지 않음 */
	INVALID_FINTECH_APP_NO("H1005", "핀테크 앱 일련번호가 유효하지 않습니다.", false),

	/** API 서비스코드 유효하지 않음 */
	INVALID_API_SERVICE_CODE("H1006", "API 서비스코드가 유효하지 않습니다.", false),

	/** 기관거래고유번호 중복 */
	DUPLICATE_TRANSACTION_UNIQUE_NO("H1007", "기관거래고유번호가 중복된 값입니다.", false),

	/** API KEY 유효하지 않음 */
	INVALID_API_KEY("H1008", "API_KEY가 유효하지 않습니다.", false),

	/** USER KEY 유효하지 않음 */
	INVALID_USER_KEY("H1009", "USER_KEY가 유효하지 않습니다.", false),

	/** 기관거래고유번호 유효하지 않음 */
	INVALID_TRANSACTION_UNIQUE_NO("H1010", "기관거래고유번호가 유효하지 않습니다.", false);

	/** 응답 코드 */
	private final String code;

	/** 오류 메시지 */
	private final String message;

	/** 재시도 가능 여부 */
	private final boolean retryable;

	/**
	 * 응답 코드로 BankErrorCode를 찾습니다.
	 *
	 * @param code 응답 코드 (예: A1014, H1008)
	 * @return 매칭되는 BankErrorCode, 없으면 GENERAL_ERROR
	 */
	public static BankErrorCode fromCode(String code) {
		if (code == null || code.isEmpty()) {
			return GENERAL_ERROR;
		}

		return Arrays.stream(values())
			.filter(e -> e.code.equals(code))
			.findFirst()
			.orElse(GENERAL_ERROR);
	}

	/**
	 * 재시도 가능한 오류인지 확인합니다.
	 *
	 * @return 재시도 가능하면 true
	 */
	public boolean isRetryable() {
		return retryable;
	}
}