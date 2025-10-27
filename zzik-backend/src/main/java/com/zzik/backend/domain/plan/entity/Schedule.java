package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 일정 엔티티
 * 여행의 세부 일정 정보를 관리합니다.
 */
@Entity
@Table(name = "schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Schedule extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@Column(name = "start_time", nullable = false)
	private LocalDateTime startTime; // 일정 시작 시간

	@Column(name = "offset_time", nullable = false)
	private Duration offsetTime; // 일정 소요 시간 (PostgreSQL INTERVAL 타입 매핑)

	@Column(name = "memo", length = 1000)
	private String memo; // 메모

	@Column(name = "has_location", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
	private Boolean hasLocation = false; // 위치 정보 존재 여부 (반정규화)

	// 양방향 연관관계 - 일정에 연결된 위치 정보 (1:1 관계로 가정)
	@OneToOne(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
	private Location location;

	@Builder
	public Schedule(Trip trip, LocalDateTime startTime, Duration offsetTime,
					String memo, Boolean hasLocation) {
		this.trip = trip;
		this.startTime = startTime;
		this.offsetTime = offsetTime;
		this.memo = memo;
		this.hasLocation = hasLocation != null ? hasLocation : false;
	}
}
