package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zzik.backend.domain.cost.entity.CostSettlement;

public interface CostSettlementRepository extends JpaRepository<CostSettlement, Long> {
}
