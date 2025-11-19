package com.zzik.backend.domain.cost.event;

import lombok.Builder;
import lombok.Getter;

@Getter
public class CostChangedEvent {
	private final Long tripId;
	private final String reason;

	@Builder
	public CostChangedEvent(Long tripId, String reason) {
		this.tripId = tripId;
		this.reason = reason;
	}
}
