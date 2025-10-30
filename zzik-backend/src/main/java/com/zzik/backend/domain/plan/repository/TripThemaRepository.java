package com.zzik.backend.domain.plan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.TripThema;

/**
 * 테마 Repository
 */
@Repository
public interface TripThemaRepository extends JpaRepository<TripThema, Long> {

	List<TripThema> findByTripId(Long tripId);

	void deleteByTripId(Long tripId);
}
