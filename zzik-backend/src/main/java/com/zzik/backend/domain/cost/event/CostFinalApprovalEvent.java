package com.zzik.backend.domain.cost.event;

import com.zzik.backend.global.event.BaseEvent;

import lombok.Builder;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Builder
public class CostFinalApprovalEvent extends BaseEvent {
	/** 해당 여행 id */
	private final Long tripId;

}
