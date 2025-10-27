package com.zzik.backend.domain.cost.repository;

import com.zzik.backend.domain.cost.entity.CostMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 비용 메뉴 Repository
 */
@Repository
public interface CostMenuRepository extends JpaRepository<CostMenu, Long> {
}
