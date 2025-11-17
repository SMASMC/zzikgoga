package com.zzik.backend.domain.plan.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.TripMember;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {

	boolean existsByTripIdAndMemberId(Long tripId, Long memberId);

	Optional<TripMember> findByTripIdAndMemberId(Long tripId, Long memberId);

	void deleteByTripId(Long tripId);

	void deleteByTripIdAndMemberId(Long tripId, Long memberId);

	List<TripMember> findAllByTripId(Long tripId);

	@Query("SELECT tm FROM TripMember tm JOIN FETCH tm.member m WHERE tm.trip.id = :tripId ORDER BY tm.createdAt ASC")
	List<TripMember> findAllByTripIdWithMemberFetch(@Param("tripId") Long tripId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
		update TripMember tm
		   set tm.isCostAccepted = false
		 where tm.trip.id = :tripId
		   and tm.isCostAccepted = true
		""")
	int invalidateAllAcceptsByTripId(@Param("tripId") Long tripId);

	@Query("""
		select tm
		from TripMember tm
		join fetch tm.member m
		where tm.trip.id = :tripId
		""")
	List<TripMember> findAllWithMemberByTripId(@Param("tripId") Long tripId);
}
