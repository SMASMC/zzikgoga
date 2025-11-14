package com.zzik.backend.domain.cost.service;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zzik.backend.domain.cost.entity.Settlement;

interface SettlementRepository extends JpaRepository<Settlement, Long> {
}
