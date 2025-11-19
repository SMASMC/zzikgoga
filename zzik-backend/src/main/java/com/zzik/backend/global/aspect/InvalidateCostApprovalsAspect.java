package com.zzik.backend.global.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.zzik.backend.domain.cost.event.CostChangedEvent;

import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
public class InvalidateCostApprovalsAspect {

    private final ApplicationEventPublisher publisher;

    // Create paths (OCR + manual create)
    @AfterReturning(
        value = "execution(* com.zzik.backend.domain.cost.service.CostService.ocrAndCreate(..)) || " +
                "execution(* com.zzik.backend.domain.cost.service.CostService.createCost(..))"
    )
    public void onCreated(JoinPoint jp) {
        Long tripId = firstLongArg(jp);
        if (tripId != null) publish(tripId, "COST_CREATED");
    }

    // Update path (edit)
    @AfterReturning(
        value = "execution(* com.zzik.backend.domain.cost.service.CostEditService.edit(..))"
    )
    public void onUpdated(JoinPoint jp) {
        Long tripId = firstLongArg(jp);
        if (tripId != null) publish(tripId, "COST_UPDATED");
    }

    // Delete path
    @AfterReturning(
        value = "execution(* com.zzik.backend.domain.cost.service.CostService.deleteCost(..))"
    )
    public void onDeleted(JoinPoint jp) {
        Long tripId = firstLongArg(jp);
        if (tripId != null) publish(tripId, "COST_DELETED");
    }

    private Long firstLongArg(JoinPoint jp) {
        Object[] args = jp.getArgs();
        if (args == null) return null;
        for (Object a : args) {
            if (a instanceof Number n) return n.longValue();
        }
        return null;
    }

    private void publish(Long tripId, String reason) {
        publisher.publishEvent(
            CostChangedEvent.builder()
                .tripId(tripId)
                .reason(reason)
                .build()
        );
    }
}

