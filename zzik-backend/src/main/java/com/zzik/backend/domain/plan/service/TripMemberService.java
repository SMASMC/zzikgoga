package com.zzik.backend.domain.plan.service;

import org.springframework.stereotype.Service;

import com.zzik.backend.domain.cost.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TripMemberService {
	private final TripMemberRepository tripMemberRepository;

	/**
	 * 멤버id와 tripId를 받아서 해당 멤버가 tripId에 속해있는지 검증해주고, 해당 TripMember를 반환해주는 함수
	 * <br>만약 속해있지않다면 ExceptionCode.NOT_TRIP_MEMBER를 throw
	 * @param memberId
	 * @param tripId
	 * @return 해당하는 TripMember객체
	 */
	public TripMember validateMembershipAndGet(long memberId, Long tripId) throws BusinessException {
		TripMember tripMember = tripMemberRepository.findByMember_IdAndTrip_Id(memberId, tripId).orElseThrow(
			() -> BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER)
		);
		return tripMember;
	}
}
