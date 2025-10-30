package com.zzik.backend.domain.plan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.Trip;

/**
 * 여행 Repository
 */
@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

	List<Trip> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
