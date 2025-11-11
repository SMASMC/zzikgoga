package com.zzik.backend.global.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
public class TripCostCompletedGuard {

	private final TripRepository tripRepository;

	@Before("execution(* com.zzik.backend.domain.cost.service.CostService.*(..)) || " +
		"execution(* com.zzik.backend.domain.cost.service.CostEditService.*(..))")
	public void validate(JoinPoint jp) {
		Object[] args = jp.getArgs();
		if (args.length == 0 || !(args[0] instanceof Long tripId))
			return;

		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND));

		if (Boolean.TRUE.equals(trip.getIsCostCompleted())) {
			throw BusinessException.from(ExceptionCode.TRIP_COST_ALREADY_COMPLETED);
		}
	}
}
