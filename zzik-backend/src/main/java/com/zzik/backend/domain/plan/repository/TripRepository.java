package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 여행 Repository
 */
@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

	// 소유자 ID로 여행 목록 조회
	List<Trip> findByOwnerId(Long ownerId);
}
