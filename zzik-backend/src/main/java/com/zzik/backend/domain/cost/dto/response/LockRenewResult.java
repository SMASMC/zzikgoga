package com.zzik.backend.domain.cost.dto.response;

import java.time.Instant;

@lombok.Value
public class LockRenewResult {
	boolean renewed;
	Instant lockExpireAt;
}
