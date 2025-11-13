package com.zzik.backend.domain.cost.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.service.TripMemberService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostSettlementService {

	private final TripMemberService tripMemberService;
	private final CostCalculateService costCalculateService;

	public void processSettlement(Long tripId, Long memberId) {
		// 0. 여행에 속해있는 모든 멤버 확인
		List<TripMember> tripMembers = tripMemberService.validateMembershipAndGetAll(memberId, tripId);
		// 1. redis에서 빠져있는 것들 확인
		List<TripMember> tripMembersToCalculate = new ArrayList<>();
		tripMembers.forEach(tm -> {
			if (!costCalculateService.hasCalculateOfTripAndMember(tm.getMember().getId(), tripId)) {
				tripMembersToCalculate.add(tm);
			}
		});
		// 2. 빠져있는 것들을 채워주기
		for (var tm : tripMembersToCalculate) {
			costCalculateService.calculate(tm.getMember().getId(), tripId);
		}
		// 3. 모든 플로우들을 토대로 순차적으로 DB트랜잭션 수행

	}
}
