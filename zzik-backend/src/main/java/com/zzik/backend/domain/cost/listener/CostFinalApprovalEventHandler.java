package com.zzik.backend.domain.cost.listener;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.zzik.backend.domain.cost.event.CostFinalApprovalEvent;
import com.zzik.backend.domain.cost.service.CostSettlementService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CostFinalApprovalEventHandler {
	private final CostSettlementService costSettlementService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	protected void handleCostFinalApprovalEvent(CostFinalApprovalEvent event) {
		Long memberId = event.getMemberId();
		Long tripId = event.getTripId();
		// 1. 정산처리 서비스의 정산 처리 호출
		costSettlementService.processSettlement(tripId, memberId);
		// 2.
	}
}
