package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "영수증 OCR 결과")
public record ReceiptOcrResponse(
	@Schema(description = "여행 ID") Long tripId,
	@Schema(description = "가게명") String storeName,
	@Schema(description = "결제 일시 원문") String date,
	@Schema(description = "카드사") String cardCompany,
	@Schema(description = "카드번호") String cardNumber,
	@Schema(description = "총 구매액", type = "integer", format = "int64", defaultValue = "0") Long totalPrice,
	@Schema(description = "항목 리스트") List<ReceiptItemDto> items
) {
	public ReceiptOcrResponse {
		if (totalPrice == null) {
			totalPrice = 0L;
		}
	}
}
