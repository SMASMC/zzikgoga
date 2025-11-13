package com.zzik.backend.domain.cost.event;

import com.zzik.backend.global.event.BaseEvent;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Builder
@Getter
public class CostFinalApprovalEvent extends BaseEvent {
	/** 해당 여행 id */
	private final Long tripId;

	/** 마지막으로 정산 수락한 멤버 id */
	private final Long memberId;
}
