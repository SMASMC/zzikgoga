package com.zzik.backend.domain.cost.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EditingMember {
	private Long memberId;
	private String memberName;
	private String thumbnailUrl;
}
