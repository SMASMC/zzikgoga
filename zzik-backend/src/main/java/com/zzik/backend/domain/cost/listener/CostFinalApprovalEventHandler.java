package com.zzik.backend.domain.cost.listener;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.zzik.backend.domain.cost.event.CostFinalApprovalEvent;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CostFinalApprovalEventHandler {
	@Async
	@EventListener
	protected void handleCostFinalApprovalEvent(CostFinalApprovalEvent event) {
		// 1. 
	}
}
