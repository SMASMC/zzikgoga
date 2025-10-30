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

	private String paidAt;   // 날짜

	private String place;           // 장소명
	private Long payerId;           // 결제자 (ID 기준)
	private Long totalAmount;       // 금액
}
