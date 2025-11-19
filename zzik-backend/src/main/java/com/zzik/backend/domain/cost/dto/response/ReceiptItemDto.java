package com.zzik.backend.domain.cost.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "영수증 품목")
public record ReceiptItemDto(
	@Schema(description = "메뉴/품목명") String name,
	@Schema(description = "수량(문자열 원본)") String count,
	@Schema(description = "단가 또는 금액(문자열 원본)") String price
) {
}
