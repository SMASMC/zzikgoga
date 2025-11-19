package com.zzik.backend.domain.cost.dto.request;

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
public class SaveCostMenuItem {
	private String menuName;
	private Integer count;
	private Long amount;
	private java.util.List<Long> memberIds;
}

