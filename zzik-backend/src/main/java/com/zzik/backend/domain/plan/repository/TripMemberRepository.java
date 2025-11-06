package com.zzik.backend.domain.plan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.TripMember;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {

	boolean existsByTripIdAndMemberId(Long tripId, Long memberId);

	void deleteByTripIdAndMemberId(Long tripId, Long memberId);
}
