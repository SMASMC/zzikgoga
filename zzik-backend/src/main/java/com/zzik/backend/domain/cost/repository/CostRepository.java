package com.zzik.backend.domain.cost.repository;

import com.zzik.backend.domain.cost.entity.Cost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 비용 Repository
 */
@Repository
public interface CostRepository extends JpaRepository<Cost, Long> {

	// 여행 ID로 비용 목록 조회
	List<Cost> findByTripId(Long tripId);
}
