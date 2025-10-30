package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

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
public class CostItemDetailResponse {
	private Long costId;
	private Long createdBy;
	private Long payerId;

	private String paidAt;

	private String place;
	private Long totalAmount;
	private String memo;
	private String receiptJson;

	private List<CostItemResponse> items;
}
