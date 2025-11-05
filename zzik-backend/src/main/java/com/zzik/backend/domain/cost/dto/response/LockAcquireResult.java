package com.zzik.backend.domain.cost.dto.response;

import java.time.Instant;

@lombok.Value
public class LockAcquireResult {
	boolean lockAcquired;
	long ownerMemberId;
	Instant lockExpireAt;

	public static LockAcquireResult acquired(long owner, Instant exp) {
		return new LockAcquireResult(true, owner, exp);
	}
}
