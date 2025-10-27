package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.TripMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 여행 멤버 Repository
 */
@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
}
