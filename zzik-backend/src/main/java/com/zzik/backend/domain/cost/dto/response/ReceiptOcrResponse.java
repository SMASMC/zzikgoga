package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "영수증 OCR 결과")
public record ReceiptOcrResponse(
	@Schema(description = "여행 ID") Long tripId,
	@Schema(description = "가게명 (지점 포함)") String storeName,
	@Schema(description = "결제 일시 원문") String date,
	@Schema(description = "카드사") String cardCompany,
	@Schema(description = "카드번호") String cardNumber,
	@Schema(description = "할부개월") String installmentMonths,
	@Schema(description = "승인번호") String approvalNumber,
	@Schema(description = "총 구매액") String totalPrice,
	@Schema(description = "결제 결과 금액(없으면 총 구매액)") String resultPrice,
	@Schema(description = "품목 리스트") List<ReceiptItemDto> items,
	@Schema(description = "원본 엔진 추론 결과(SUCCESS/FAIL)") String inferResult
) {
}
