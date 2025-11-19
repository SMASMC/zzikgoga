package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zzik.backend.domain.cost.entity.SettlementTransaction;

public interface SettlementTransactionRepository extends JpaRepository<SettlementTransaction, Long> {
}