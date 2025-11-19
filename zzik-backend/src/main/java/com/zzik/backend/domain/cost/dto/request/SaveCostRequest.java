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
	/** 변수 이름으론 Json이지만, 사용자가 올린 증빙자료의 base64*/
	private String receiptJson;
	private List<SaveCostMenuItem> items = new ArrayList<>();
}
