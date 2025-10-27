package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 여행 테마 엔티티 (중간 테이블)
 * 여행과 테마의 다대다 관계를 관리합니다.
 */
@Entity
@Table(name = "trip_thema")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripThema extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "thema_id", nullable = false)
	private Thema thema; // FK to thema.id

	@Builder
	public TripThema(Trip trip, Thema thema) {
		this.trip = trip;
		this.thema = thema;
	}
}
