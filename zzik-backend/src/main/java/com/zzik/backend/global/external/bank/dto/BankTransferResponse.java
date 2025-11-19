package com.zzik.backend.global.external.bank.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BankTransferResponse {
	/**
	 * 공통 Header 정보
	 * 예시: {
	 *   "responseCode": "H0000",
	 *   "responseMessage": "정상처리 되었습니다.",
	 *   "apiName": "updateDemandDepositAccountTransfer",
	 *   ...
	 * }
	 */
	@JsonProperty("Header")
	private Header header;

	/**
	 * 거래 목록(REC)
	 * 예시:
	 * [
	 *   {
	 *     "transactionUniqueNo": "61",
	 *     "accountNo": "0016174648358792",
	 *     ...
	 *   },
	 *   ...
	 * ]
	 */
	@JsonProperty("REC")
	private List<Record> rec;

	// 내부 클래스 정의
	@Getter
	@Setter
	public static class Header {
		/** 응답 코드 (예: H0000) */
		private String responseCode;
		/** 응답 메시지 (예: 정상처리 되었습니다.) */
		private String responseMessage;
		/** API명 (예: updateDemandDepositAccountTransfer) */
		private String apiName;
		/** 전송 일자 (YYYYMMDD, 예: 20240401) */
		private String transmissionDate;
		/** 전송 시간 (HHMMSS, 예: 103500) */
		private String transmissionTime;
		/** 기관 코드 (예: 00100) */
		private String institutionCode;
		/** API Key */
		private String apiKey;
		/** API 서비스 코드 */
		private String apiServiceCode;
		/** 기관 거래 고유 번호 */
		private String institutionTransactionUniqueNo;
	}

	@Getter
	@Setter
	public static class Record {
		/** 거래 고유번호 (Long, 예: "61") */
		private String transactionUniqueNo;
		/** 계좌번호 (길이: 16, 예: "0016174648358792") */
		private String accountNo;
		/** 거래일자 (YYYYMMDD, 예: "20240401") */
		private String transactionDate;
		/** 거래유형 (길이: 1, 예: "1", "2") */
		private String transactionType;
		/** 거래유형명 (예: "입금(이체)", "출금(이체)") */
		private String transactionTypeName;
		/** 거래 계좌번호 (길이: 16, 예: "0204667768182760") */
		private String transactionAccountNo;
	}
}
