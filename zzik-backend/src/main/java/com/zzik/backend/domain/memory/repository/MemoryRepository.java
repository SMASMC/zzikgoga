package com.zzik.backend.domain.memory.repository;

import com.zzik.backend.domain.memory.entity.Memory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 추억 Repository
 */
@Repository
public interface MemoryRepository extends JpaRepository<Memory, Long> {

	// 여행 ID로 추억 목록 조회
	List<Memory> findByTripId(Long tripId);

	// 회원 ID로 추억 목록 조회
	List<Memory> findByMemberId(Long memberId);
}
