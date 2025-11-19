package com.zzik.backend.global.external.bank.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;

/**
 * 은행 계좌 이체 요청 DTO
 * <p>
 * API: updateDemandDepositAccountTransfer (수시입출금 계좌 이체)
 * </p>
 */
@Builder
public record BankTransferRequest(
	/** 공통 헤더 (JSON 필드명: "Header", 대소문자 주의) */
	@JsonProperty("Header")
	BankHeaderDto header,

	/** 입금계좌번호 (원화, 외화 계좌 가능, 16자) */
	String depositAccountNo,

	/** 거래금액 (출금할 금액) */
	Long transactionBalance,

	/** 출금계좌번호 (원화 계좌만 가능, 16자) */
	String withdrawalAccountNo,

	/** 거래 요약내용 - 입금계좌 (최대 255자, 선택) */
	String depositTransactionSummary,

	/** 거래 요약내용 - 출금계좌 (최대 255자, 선택) */
	String withdrawalTransactionSummary
) {
}
