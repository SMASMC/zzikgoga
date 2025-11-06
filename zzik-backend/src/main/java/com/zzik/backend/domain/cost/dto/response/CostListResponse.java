package com.zzik.backend.domain.cost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CostListResponse {
	private Long costId;
	private String paidAt;
	private String place;
	private Long payerId;
	private Long totalAmount;
}
