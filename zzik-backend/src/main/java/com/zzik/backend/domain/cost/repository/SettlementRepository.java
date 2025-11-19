package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zzik.backend.domain.cost.entity.Settlement;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
}
