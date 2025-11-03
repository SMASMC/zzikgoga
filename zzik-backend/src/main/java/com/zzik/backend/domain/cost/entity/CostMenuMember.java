package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cost_menu_member")
public class CostMenuMember extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// 레거시 테이블: 현재 사용 안 함 - cost_menu.must_payer_ids로 대체
	// @Column(name = "member_id", nullable = false)
	// private Long memberId;

	// @Column(name = "cost_menu_id", nullable = false)
	// private Long costMenuId;
}
