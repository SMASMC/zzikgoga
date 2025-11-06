package com.zzik.backend.domain.cost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class LockRenewResponse {
	private Long costId;
	private boolean renewed;
	private String lockExpireAt;
}
