package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 비용 메뉴 멤버 엔티티 (중간 테이블)
 * 메뉴와 결제 멤버의 다대다 관계를 관리합니다.
 */
@Entity
@Table(name = "cost_menu_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CostMenuMember extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "member_id", nullable = false)
	private Member member; // FK to member.id

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "cost_menu_id", nullable = false)
	private CostMenu costMenu; // FK to cost_menu.id

	@Builder
	public CostMenuMember(Member member, CostMenu costMenu) {
		this.member = member;
		this.costMenu = costMenu;
	}
}
