package com.zzik.backend.domain.cost.dto.request;

import java.util.ArrayList;
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
public class SaveCostRequest {
	private Long createdBy;
	private Long payerId;
	private String paidAt;
	private String place;
	private Long totalAmount;
	private String memo;
	private String receiptJson;
	private List<SaveCostMenuItem> items = new ArrayList<>();
}
