package com.zzik.backend.domain.plan.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.Trip;

/**
 * 여행 Repository
 */
@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

	List<Trip> findDistinctByTripMembersMemberIdOrderByCreatedAtDesc(Long memberId);

	/**
	 * Cursor-paged trips for a member ordered by id desc.
	 */
	@Query("""
		SELECT DISTINCT t FROM Trip t
		JOIN t.tripMembers tm
		WHERE tm.member.id = :memberId
		  AND (:cursor IS NULL OR t.id < :cursor)
		ORDER BY t.id DESC
		""")
	List<Trip> findByMemberIdCursorPaged(
		@Param("memberId") Long memberId,
		@Param("cursor") Long cursor,
		Pageable pageable
	);

	@Query("""
		    select distinct m.id
		    from Trip t
		    left join t.tripMembers tm
		    left join tm.member m
		    where t.id = :tripId
		""")
	List<Long> findMemberIdsByTripId(@Param("tripId") Long tripId);

}
