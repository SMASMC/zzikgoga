package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 여행 동반자 엔티티 (중간 테이블)
 * 여행과 동반자의 다대다 관계를 관리합니다.
 */
@Entity
@Table(name = "trip_companion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripCompanion extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "companion_id", nullable = false)
	private Companion companion; // FK to companion.id

	@Builder
	public TripCompanion(Trip trip, Companion companion) {
		this.trip = trip;
		this.companion = companion;
	}
}
