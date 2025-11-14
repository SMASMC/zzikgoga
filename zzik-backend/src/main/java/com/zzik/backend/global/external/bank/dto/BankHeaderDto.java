package com.zzik.backend.global.external.bank.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.zzik.backend.global.external.bank.BankApiType;

/**
 * 은행 API 공통 헤더
 */
public class BankHeaderDto {
	/** API 이름 (호출 api uri의 마지막 path명 */
	@JsonProperty("apiName")
	String apiName;

	/** api 전송 일자 (YYYYMMDD) */
	String transmissionDate;

	/** api 전송 시각 (HHmmss) */
	String transmissionTime;

	/** 기관 코드("00100"으로 고정)*/
	final String institutionCode = "00100";

	/** 핀테크 앱 번호 */
	final String fintechAppNo = "001";

	/** API 서비스 코드(api 이름 필드와 동일) */
	String apiServiceCode;

	/** 기관 거래 고유 번호
	 * 새로운 번호로 임의 채번 (YYYYMMDD + HHMMSS + 일련번호 6자리) 또는 20자리의 난수
	 * API 요청 시 사용자가 항상 새로운 번호로 임의 채번해야 함.
	 * 예: 2024021609000000000, 2024021609000000001
	 * */
	String institutionTransactionUniqueNo;

	/** API 키 */
	String apiKey;

	/** 사용자 키 */
	String userKey;

	private BankHeaderDto(String apiName, String apiKey, String userKey) {
		LocalDateTime now = LocalDateTime.now();

		// 전송일자, 전송시각 채우기
		this.transmissionDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
		this.transmissionTime = now.format(DateTimeFormatter.ofPattern("HHmmss"));

		// 기관 거래 고유 번호 생성 (YYYYMMDD + HHMMSS + 난수 6자리)
		String random6Digits = String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
		this.institutionTransactionUniqueNo = this.transmissionDate + this.transmissionTime + random6Digits;

		// 외부에서 받은 값 설정
		this.apiName = apiName;
		this.apiServiceCode = apiName; // API 서비스 코드는 api 이름과 동일
		this.apiKey = apiKey;
		this.userKey = userKey;
	}

	/**
	 * BankHeaderDto 생성 팩토리 메서드
	 * <p>
	 * apiName은 BankApiType ENUM에서 URI를 기준으로 자동 추출되며,
	 * apiKey와 userKey는 application.yml의 설정에서 자동으로 가져오고,
	 * 전송일자, 전송시각, 고유번호는 자동 생성됩니다.
	 * </p>
	 *
	 * @param apiType 은행 API 타입 (TRANSFER, TRANSFER_LIST 등)
	 * @return 생성된 BankHeaderDto
	 */
	public static BankHeaderDto of(BankApiType apiType) {
		// URI에서 마지막 path명 추출 (예: updateDemandDepositAccountTransfer)
		String apiName = apiType.getApiName();

		return new BankHeaderDto(
			apiName,
			BankApiType.getCredentials().getAppKey(),
			BankApiType.getCredentials().getUserKey()
		);
	}
}
