package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 여행 멤버 엔티티 (중간 테이블)
 * 여행과 회원의 다대다 관계를 관리합니다.
 */
@Entity
@Table(name = "trip_member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripMember extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "member_id", nullable = false)
	private Member member; // FK to member.id

	@Column(name = "is_cost_accepted", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
	private Boolean isCostAccepted = false; // 정산 동의 여부

	@Builder
	public TripMember(Trip trip, Member member, Boolean isCostAccepted) {
		this.trip = trip;
		this.member = member;
		this.isCostAccepted = isCostAccepted != null ? isCostAccepted : false;
	}
}
