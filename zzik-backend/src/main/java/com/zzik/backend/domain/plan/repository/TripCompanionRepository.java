package com.zzik.backend.domain.plan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.TripCompanion;

/**
 * 여행 멤버 Repository
 */
@Repository
public interface TripCompanionRepository extends JpaRepository<TripCompanion, Long> {
	List<TripCompanion> findByTripId(Long tripId);

	void deleteByTripId(Long tripId);

	boolean existsByTripIdAndCompanionId(Long tripId, Long companionId);
}
