package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.CostMenuMember;

@Repository
public interface CostMenuMemberRepository extends JpaRepository<CostMenuMember, Long> {
	long countByCostMenuId(Long costMenuId);

	void deleteByCostMenuIdAndMemberId(Long costMenuId, Long memberId);

	boolean existsByCostMenuIdAndMemberId(Long costMenuId, Long memberId);
}
