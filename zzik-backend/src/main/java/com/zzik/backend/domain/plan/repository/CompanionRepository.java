package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.Companion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 동반자 Repository
 */
@Repository
public interface CompanionRepository extends JpaRepository<Companion, Long> {
}
