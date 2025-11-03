package com.zzik.backend.domain.cost.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.cost.entity.CostMenuMember;

@Repository
public interface CostMenuMemberRepository extends JpaRepository<CostMenuMember, Long> {
	// 레거시 테이블: 현재 사용 안 함 - cost_menu.must_payer_ids로 대체
	// TODO: 레거시 테이블 제거 시 Repository 전체 삭제

	// long countByCostMenu_Id(Long costMenuId);
	// void deleteByCostMenuIdAndMemberId(Long costMenuId, Long memberId);
	// boolean existsByCostMenuIdAndMemberId(Long costMenuId, Long memberId);
}
