package com.zzik.backend.domain.cost.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.domain.plan.service.TripMemberService;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostApprovalService {
	private final TripMemberRepository tripMemberRepository;
	private final TripRepository tripRepository;
	private final TripMemberService tripMemberService;

	@Transactional
	public CostApprovalResponse doCostApproval(Long tripId, CostApprovalRequest request) {
		//1. TripMemeber의 isCostAccepted를 True로
		long memberId = SecurityUtil.getCurrentMemberId();
		if (!tripRepository.existsById(tripId))
			throw BusinessException.from(ExceptionCode.TRIP_NOT_FOUND);
		// TripMember tripMember = tripMemberRepository.findByMember_IdAndTrip_Id(memberId, tripId).orElseThrow(
		// 	() -> BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER)
		// );
		TripMember tripMember = tripMemberService.validateMembershipAndGet(memberId, tripId);
		//2. 이미 true면 에러
		if (tripMember.getIsCostAccepted())
			throw BusinessException.from(ExceptionCode.ALREADY_ACCEPTED_COST);
		tripMember.setIsCostAccepted(true);
		// NOTE: @Transactional엔 save 필요없음 영속성 보장됨.
		// tripMemberRepository.save(tripMember);
		return CostApprovalResponse.builder()
			.isAccepted(tripMember.getIsCostAccepted())
			.acceptedAt(LocalDateTime.now().toString())
			.memberId(memberId)
			.build();
	}
}
