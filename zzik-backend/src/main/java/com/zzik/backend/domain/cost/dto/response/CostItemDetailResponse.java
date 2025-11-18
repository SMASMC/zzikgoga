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
	/** 이름은 Json이지만, 이미지s3 url이 담길 것임*/
	private String receiptJson;
	private List<CostItemResponse> items;
}
