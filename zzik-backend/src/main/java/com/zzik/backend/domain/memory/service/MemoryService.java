package com.zzik.backend.domain.memory.service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.memory.dto.request.MemorySaveRequest;
import com.zzik.backend.domain.memory.dto.response.MemoryDetailResponse;
import com.zzik.backend.domain.memory.entity.Memory;
import com.zzik.backend.domain.memory.enums.MintStatus;
import com.zzik.backend.domain.memory.repository.MemoryRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class MemoryService {

	private final MemoryRepository memoryRepository;
	private final MemberRepository memberRepository;
	private final TripRepository tripRepository;
	private final TripMemberRepository tripMemberRepository;

	/**
	 * 1. 여행 기록 저장 (Upsert: Create or Update)
	 */
	public MemoryDetailResponse saveMemory(Long tripId, Long memberId, MemorySaveRequest request) {

		System.out.println("Received JSON content: {}"+ request.content());
		// 1. 권한 검사 (여행 멤버인지)
		checkTripMembership(tripId, memberId);

		// 2. 기존 기록 조회
		Optional<Memory> existingMemory = memoryRepository.findByTripIdAndMemberId(tripId, memberId);

		Memory memory;
		if (existingMemory.isPresent()) {
			// [Update]
			memory = existingMemory.get();
			memory.update(request.title(), request.content(), request.status());
		} else {
			// [Create]
			// 엔티티 조회 (생성에만 필요)
			Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));
			Trip trip = tripRepository.findById(tripId)
				.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

			memory = Memory.builder()
				.member(member)
				.trip(trip)
				.title(request.title())
				.content(request.content())
				.status(request.status())
				.mintStatus(MintStatus.none)
				.build();
		}

		// 3. 저장 (Create 또는 Update)
		Memory savedMemory = memoryRepository.save(memory);

		// 4. 저장된 상세 정보로 DTO 반환
		// (주의: Fetch Join을 쓰지 않았으므로, from 메서드가 지연 로딩을 트리거할 수 있음)
		// (성능이 중요하다면, 저장 후 다시 findWithDetailsFetch로 조회해야 함)
		// 여기서는 간단하게 DTO 변환
		return MemoryDetailResponse.from(savedMemory);
	}

	/**
	 * 2. 나의 여행 기록 상세 조회
	 */
	@Transactional(readOnly = true)
	public MemoryDetailResponse getMyMemory(Long tripId, Long memberId) {

		// 1. 권한 검사 (여행 멤버인지)
		checkTripMembership(tripId, memberId);

		// 2. 데이터 조회 (N+1 방지 Fetch Join)
		Memory memory = memoryRepository.findByTripIdAndMemberIdWithDetailsFetch(tripId, memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		// 3. DTO 변환 및 반환
		return MemoryDetailResponse.from(memory);
	}


	/**
	 * [Helper] 사용자가 해당 여행의 멤버인지 확인
	 */
	private void checkTripMembership(Long tripId, Long memberId) {
		if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
			throw BusinessException.from(ExceptionCode.FORBIDDEN);
		}
	}
}
