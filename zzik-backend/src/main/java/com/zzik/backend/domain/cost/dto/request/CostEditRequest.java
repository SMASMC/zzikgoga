package com.zzik.backend.domain.cost.dto.request;

import java.util.List;

import lombok.Builder;

@Builder
public record CostEditRequest(
	String paidAt,
	String place,
	Long payerId,
	String memo,
	List<MenuDto> menus,
	List<Long> deletedMenuIds
) {
	public record MenuDto(Long costMenuId, String menuName, Long amount, Integer count, List<Long> payerIds) {
	}
}
