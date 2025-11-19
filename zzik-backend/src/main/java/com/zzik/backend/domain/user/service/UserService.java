package com.zzik.backend.domain.user.service;

import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.domain.user.dto.response.TripMemberListResponse;
import com.zzik.backend.domain.user.dto.response.TripMemberResponse;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode; // (존재한다고 가정)
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserService {

	private final TripRepository tripRepository;
	private final TripMemberRepository tripMemberRepository;

	public TripMemberListResponse getTripMembers(Long tripId) {

		if (!tripRepository.existsById(tripId)) {
			throw BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE);
		}

		List<TripMember> tripMembers = tripMemberRepository.findAllByTripIdWithMemberFetch(tripId);

		List<TripMemberResponse> memberResponses = tripMembers.stream()
			.map(tripMember -> new TripMemberResponse(
				tripMember.getMember().getId(),
				tripMember.getMember().getName(),
				tripMember.getMember().getThumbnailUrl(),
				tripMember.getCreatedAt()
			))
			.collect(Collectors.toList());

		return new TripMemberListResponse(tripId, memberResponses);
	}
}
