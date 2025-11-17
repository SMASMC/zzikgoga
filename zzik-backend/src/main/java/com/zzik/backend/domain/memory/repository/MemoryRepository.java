package com.zzik.backend.domain.memory.repository;

import com.zzik.backend.domain.memory.entity.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 추억 Repository
 */
@Repository
public interface MemoryRepository extends JpaRepository<Memory, Long> {

	// 여행 ID로 추억 목록 조회
	List<Memory> findByTripId(Long tripId);

	// 회원 ID로 추억 목록 조회
	List<Memory> findByMemberId(Long memberId);

	/**
	 * [수정]
	 * Trip ID와 Member ID로 Memory를 조회합니다. (N+1 방지 - Member, Trip Fetch Join)
	 * (상세 조회용)
	 */
	@Query("SELECT m FROM Memory m " +
		"JOIN FETCH m.member " +
		"JOIN FETCH m.trip " +
		"WHERE m.trip.id = :tripId AND m.member.id = :memberId")
	Optional<Memory> findByTripIdAndMemberIdWithDetailsFetch(
		@Param("tripId") Long tripId,
		@Param("memberId") Long memberId
	);

	/**
	 * [추가]
	 * Trip ID와 Member ID로 Memory를 조회합니다.
	 * (Upsert 로직에서 간단한 조회용)
	 */
	Optional<Memory> findByTripIdAndMemberId(Long tripId, Long memberId);

	/**
	 * [추가]
	 * 여행 기록이 존재하는지 확인합니다. (권한 확인용)
	 */
	boolean existsByTripIdAndMemberId(Long tripId, Long memberId);
}
