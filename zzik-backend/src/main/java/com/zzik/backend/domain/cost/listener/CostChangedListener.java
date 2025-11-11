package com.zzik.backend.domain.cost.listener;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.zzik.backend.domain.cost.event.CostChangedEvent;
import com.zzik.backend.domain.plan.service.TripMemberService;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CostChangedListener {

	private final TripMemberService tripMemberService;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
	public void onCostChanged(CostChangedEvent event) {
		tripMemberService.invalidateAllByTrip(event.getTripId());
	}
}
