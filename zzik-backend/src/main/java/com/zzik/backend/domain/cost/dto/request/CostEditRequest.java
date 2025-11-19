package com.zzik.backend.domain.cost.dto.request;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
@Schema(description = "비용 수정 요청 DTO")
public record CostEditRequest(
	@Schema(description = "결제 시각 (yyyy-MM-dd HH:mm)", example = "2025-10-25 14:30")
	@NotBlank
	String paidAt,

	@Schema(description = "장소", example = "스타벅스 강남점")
	@NotBlank
	String place,

	@Schema(description = "대표 결제자 ID", example = "3")
	@NotNull
	Long payerId,

	@Schema(description = "메모", example = "수정된 메모")
	String memo,

	@Schema(description = "메뉴 목록")
	@Valid
	List<MenuDto> menus
) {
	@Builder
	public record MenuDto(
		@Schema(description = "기존 메뉴 ID (null이면 신규 추가)", example = "41")
		Long costMenuId,

		@Schema(description = "메뉴명", example = "아메리카노")
		@NotBlank
		String menuName,

		@Schema(description = "수량", example = "1")
		@Min(1)
		int count,

		@Schema(description = "총 금액", example = "4500")
		@Min(0)
		long amount,

		@Schema(description = "이 메뉴를 결제할 멤버 ID 목록", example = "[3, 5]")
		@NotNull
		List<Long> payerIds
	) {
	}
}
