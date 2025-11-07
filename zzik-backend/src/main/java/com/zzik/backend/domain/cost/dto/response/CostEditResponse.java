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
		private Long amount;
		private List<PayerDto> payers;
	}

	@Getter
	@Builder
	public static class PayerDto {
		private Long memberId;
		private String memberName;
	}

	public static CostEditResponse fromEntity(
		com.zzik.backend.domain.cost.entity.Cost cost
	) {
		return CostEditResponse.builder()
			.costId(cost.getId())
			.paidAt(cost.getPaidAt())
			.place(cost.getPlace())
			.payerId(cost.getPayer().getId())
			.payerName(cost.getPayer().getName())
			.totalAmount(cost.getTotalAmount())
			.memo(cost.getMemo())
			.menus(cost.getCostMenus().stream()
				.map(menu -> MenuDto.builder()
					.costMenuId(menu.getId())
					.menuName(menu.getMenuName())
					.amount(menu.getAmount())
					.payers(menu.getMustPayerIds() == null ? List.of() :
						menu.getMustPayerIds().stream()
							.map(pid -> {
								var name = cost.getTrip()
									.getTripMembers()
									.stream()
									.filter(tm -> tm.getMember().getId().equals(pid))
									.map(tm -> tm.getMember().getName())
									.findFirst()
									.orElse(null);
								return PayerDto.builder()
									.memberId(pid)
									.memberName(name)
									.build();
							})
							.toList())
					.build())
				.toList())
			.build();
	}
}

