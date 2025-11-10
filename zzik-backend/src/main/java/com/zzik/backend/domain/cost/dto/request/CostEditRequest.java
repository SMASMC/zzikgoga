package com.zzik.backend.domain.cost.dto.request;

import java.util.List;

import lombok.Builder;

@Builder
public record CostEditRequest(
	String paidAt,
	String place,
	Long payerId,
	String memo,
	List<MenuDto> menus
) {
	@Builder
	public record MenuDto(
		Long costMenuId,     // null이면 INSERT
		String menuName,
		Integer count,       // null이면 1로 처리
		Long amount,
		List<Long> payerIds  // mustPayerIds
	) {
	}
}
