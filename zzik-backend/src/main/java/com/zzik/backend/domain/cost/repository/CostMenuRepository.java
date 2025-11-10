package com.zzik.backend.domain.cost.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.CostMenu;

@Repository
public interface CostMenuRepository extends JpaRepository<CostMenu, Long> {
	List<CostMenu> findAllByCost_Id(Long costId);

	Optional<CostMenu> findByIdAndCostId(Long id, Long costId);

	// 🔹 존재 확인이 필요할 때(옵션)
	boolean existsByIdAndCost_Id(Long id, Long costId);

	// 🔹 일괄 삭제가 필요할 때(옵션)
	void deleteAllByCost_IdAndIdIn(Long costId, Collection<Long> ids);
}
