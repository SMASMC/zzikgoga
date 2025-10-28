package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.CostMenu;

@Repository
public interface CostMenuRepository extends JpaRepository<CostMenu, Long> {
	long findByCostId(Long costId);
}
