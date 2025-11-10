package com.zzik.backend.domain.cost.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.CostMenu;

@Repository
public interface CostMenuRepository extends JpaRepository<CostMenu, Long> {
	List<CostMenu> findAllByCost_Id(Long costId);

	Optional<CostMenu> findByIdAndCostId(Long id, Long costId);
}
