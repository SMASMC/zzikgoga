package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Builder
@Schema(description = "비용 수정 응답 DTO")
public record CostEditResponse(
	@Schema(description = "비용 ID", example = "15")
	Long costId,

	@Schema(description = "결제 시각", example = "2024-12-20(금)")
	String paidAt,

	@Schema(description = "장소", example = "스타벅스 강남점")
	String place,

	@Schema(description = "대표 결제자 ID", example = "3")
	Long payerId,

	@Schema(description = "대표 결제자 이름", example = "김철수")
	String payerName,

	@Schema(description = "총 결제 금액", example = "10500")
	Long totalAmount,

	@Schema(description = "메모", example = "수정된 메모")
	String memo,

	@Schema(description = "메뉴 목록")
	List<MenuDto> menus
) {

	@Builder
	@Schema(description = "비용 메뉴 상세 응답 DTO")
	public record MenuDto(
		@Schema(description = "비용 메뉴 ID", example = "41")
		Long costMenuId,

		@Schema(description = "메뉴명", example = "아메리카노")
		String menuName,

		@Schema(description = "수량", example = "1")
		int count,

		@Schema(description = "금액", example = "4500")
		long amount,

		@Schema(description = "이 메뉴를 결제할 멤버 목록")
		List<PayerDto> payers
	) {
		@Builder
		@Schema(description = "결제자 정보 응답 DTO")
		public record PayerDto(
			@Schema(description = "멤버 ID", example = "3")
			Long memberId,

			@Schema(description = "멤버 이름", example = "김철수")
			String memberName
		) {
		}
	}
}
