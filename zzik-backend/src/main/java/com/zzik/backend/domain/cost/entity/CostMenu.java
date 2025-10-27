package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 비용 메뉴 엔티티
 * 영수증의 개별 메뉴 항목 정보를 관리합니다.
 */
@Entity
@Table(name = "cost_menu")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CostMenu extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "cost_id", nullable = false)
	private Cost cost; // FK to cost.id

	@Column(name = "menu_name", nullable = false, length = 200)
	private String menuName; // 메뉴 이름 (메뉴가 없는 불친절한 영수증인 경우 "전체"로 1개의 row 저장)

	@Column(name = "amount", nullable = false)
	private Long amount; // 메뉴 금액

	@Column(name = "n_cost_menu_member", nullable = false, columnDefinition = "SMALLINT DEFAULT 0")
	private Short nCostMenuMember = 0; // 반정규화: 정산별 메뉴별 결제자 수 (그룹 카운트 성능 개선용)

	// 양방향 연관관계 - 메뉴를 결제한 멤버들
	@OneToMany(mappedBy = "costMenu", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CostMenuMember> costMenuMembers = new ArrayList<>();

	@Builder
	public CostMenu(Cost cost, String menuName, Long amount, Short nCostMenuMember) {
		this.cost = cost;
		this.menuName = menuName;
		this.amount = amount;
		this.nCostMenuMember = nCostMenuMember != null ? nCostMenuMember : 0;
	}
}
