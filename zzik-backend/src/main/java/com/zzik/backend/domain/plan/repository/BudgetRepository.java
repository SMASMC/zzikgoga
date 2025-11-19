package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 예산 Repository
 */
@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

	// 여행 ID로 예산 목록 조회
	List<Budget> findByTripId(Long tripId);
}
