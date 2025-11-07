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
public class CostItemResponse {
	private String menuName;
	private Integer count;
	private Long amount;
	private List<Long> memberIds;
}
