package com.zzik.backend.domain.cost.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.Cost;

/**
 * 비용 Repository
 */
@Repository
public interface CostRepository extends JpaRepository<Cost, Long> {
	// 여행 ID로 비용 목록 조회
	List<Cost> findByTripId(Long tripId);

	@Query("""
		    select distinct c
		    from Cost c
		    left join fetch c.payer
		    left join fetch c.costMenus m
		    where c.trip.id = :tripId
		    order by c.paidAt
		""")
	List<Cost> findAllWithMenusByTripId(Long tripId);

	Optional<Cost> findByIdAndTripId(Long costId, Long tripId);
}
