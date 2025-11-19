package com.zzik.backend.domain.plan.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TripMemberService {
	private final TripMemberRepository tripMemberRepository;

	/**
	 * 멤버 ID와 여행 ID를 받아서 해당 멤버가 여행에 속해있는지 검증하고, 해당 TripMember 객체를 반환합니다.
	 * <br>만약 속해있지 않다면 ExceptionCode.NOT_TRIP_MEMBER를 throw합니다.
	 *
	 * @param memberId 검증할 멤버 ID
	 * @param tripId   여행 ID
	 * @return 해당 멤버의 TripMember 객체
	 * @throws BusinessException 멤버가 여행에 속해있지 않은 경우(NOT_TRIP_MEMBER)
	 */
	public TripMember validateMembershipAndGet(long memberId, Long tripId) throws BusinessException {
		var fetchedTripMembers = tripMemberRepository.findAllByTripId(tripId);

		return fetchedTripMembers.stream()
			.filter(tm -> tm.getMember().getId().equals(memberId))
			.findFirst()
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER));
	}

	/**
	 * 멤버 ID와 여행 ID를 받아서 해당 멤버가 여행에 속해있는지 검증하고, 해당 여행의 모든 TripMember 리스트를 반환합니다.
	 * <br>만약 요청한 멤버가 여행에 속해있지 않다면 ExceptionCode.NOT_TRIP_MEMBER를 throw합니다.
	 *
	 * @param memberId 검증할 멤버 ID
	 * @param tripId   여행 ID
	 * @return 해당 여행의 모든 TripMember 객체 리스트
	 * @throws BusinessException 멤버가 여행에 속해있지 않은 경우
	 */
	public List<TripMember> validateMembershipAndGetAll(long memberId, Long tripId) throws BusinessException {
		var fetchedTripMembers = tripMemberRepository.findAllByTripId(tripId);

		boolean hasMembership = fetchedTripMembers.stream()
			.anyMatch(tm -> tm.getMember().getId().equals(memberId));

		if (!hasMembership) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}

		return fetchedTripMembers;
	}
	
	@Transactional
	public int invalidateAllByTrip(Long tripId) {
		return tripMemberRepository.invalidateAllAcceptsByTripId(tripId);
	}

}
