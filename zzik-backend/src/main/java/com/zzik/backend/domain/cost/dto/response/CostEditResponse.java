package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CostEditResponse {
	private Long costId;
	private String paidAt;
	private String place;
	private Long payerId;
	private String payerName;
	private Long totalAmount;
	private String memo;
	private List<MenuDto> menus;

	@Getter
	@Builder
	public static class MenuDto {
		private Long costMenuId;
		private String menuName;
		private Integer count;
		private Long amount;
		private List<PayerDto> payers;
	}

	@Getter
	@Builder
	public static class PayerDto {
		private Long memberId;
		private String memberName;
	}
}
