package com.zzik.backend.domain.cost.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.plan.entity.TripMember;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
	Optional<TripMember> findByMember_IdAndTrip_Id(long memberId, Long tripId);
}
