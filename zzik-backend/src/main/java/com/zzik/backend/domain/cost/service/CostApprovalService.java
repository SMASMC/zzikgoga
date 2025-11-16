package com.zzik.backend.domain.cost.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.domain.cost.dto.response.CostApprovalStatusResponse;
import com.zzik.backend.domain.cost.dto.response.CostApprovalStatusResponse.AcceptedMemberDto;
import com.zzik.backend.domain.cost.dto.response.CostApprovalStatusResponse.NotAcceptedMemberDto;
import com.zzik.backend.domain.cost.event.CostFinalApprovalEvent;
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
	private final ApplicationEventPublisher applicationEventPublisher;

	@Transactional
	public CostApprovalResponse doCostApproval(Long tripId, CostApprovalRequest request) {
		//1. TripMemeber의 isCostAccepted를 True로
		long memberId = SecurityUtil.getCurrentMemberId();
		if (!tripRepository.existsById(tripId))
			throw BusinessException.from(ExceptionCode.TRIP_NOT_FOUND);
		TripMember tripMember = tripMemberService.validateMembershipAndGet(memberId, tripId);
		//2. 이미 true면 에러
		if (tripMember.getIsCostAccepted())
			throw BusinessException.from(ExceptionCode.ALREADY_ACCEPTED_COST);
		tripMember.setIsCostAccepted(true);
		// NOTE: @Transactional엔 save 필요없음 영속성 보장됨.
		// tripMemberRepository.save(tripMember);

		// 최종 정산인지 확인 -> 실제 결제 서비스 실행
		applicationEventPublisher.publishEvent(
			new CostFinalApprovalEvent(tripId, memberId)
		);

		return CostApprovalResponse.builder()
			.isAccepted(tripMember.getIsCostAccepted())
			.acceptedAt(LocalDateTime.now().toString())
			.memberId(memberId)
			.build();
	}

	@Transactional(readOnly = true)
	public CostApprovalStatusResponse getCostApproveStatuses(Long tripId) {
		// 0. 해당 멤버가 여행에 속해있는지 검증
		// 1. 여행에 해당하는 TripMember행 전체 조회
		Long memberId = SecurityUtil.getCurrentMemberId();
		var tripMembers = tripMemberService.validateMembershipAndGetAll(memberId, tripId);

		// 2. 수락한 멤버와 수락하지 않은 멤버 분류
		List<AcceptedMemberDto> acceptedMembers = new ArrayList<>();
		List<NotAcceptedMemberDto> notAcceptedMembers = new ArrayList<>();

		for (TripMember tm : tripMembers) {
			if (tm.getIsCostAccepted()) {
				// 수락한 멤버
				acceptedMembers.add(new AcceptedMemberDto(
					tm.getMember().getId(),
					tm.getMember().getName(),
					tm.getMember().getThumbnailUrl(),
					tm.getUpdatedAt().toString()
				));
			} else {
				// 수락하지 않은 멤버
				notAcceptedMembers.add(new NotAcceptedMemberDto(
					tm.getMember().getId(),
					tm.getMember().getName(),
					tm.getMember().getThumbnailUrl()
				));
			}
		}

		// 3. 통계 계산
		int acceptedCount = acceptedMembers.size();
		int totalMemberCount = tripMembers.size();
		double acceptanceRate = totalMemberCount > 0
			? (acceptedCount * 100.0) / totalMemberCount
			: 0.0;

		// 4. 응답 생성
		var response = CostApprovalStatusResponse.builder()
			.tripId(tripId)
			.acceptedMembers(acceptedMembers)
			.notAcceptedMembers(notAcceptedMembers)
			.acceptedCount(acceptedCount)
			.totalMemberCount(totalMemberCount)
			.acceptanceRate(acceptanceRate)
			.build();
		return response;
	}
}
