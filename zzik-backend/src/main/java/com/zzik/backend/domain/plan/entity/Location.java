package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 위치 엔티티
 * 일정의 위치 정보를 관리합니다.
 */
@Entity
@Table(name = "location")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Location extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY) // 일정과 1:1 관계
	@JoinColumn(name = "schedule_id", nullable = false)
	private Schedule schedule; // FK to schedule.id

	@Column(name = "name", nullable = false, length = 200)
	private String name; // 장소명

	@Column(name = "sido", nullable = false, length = 20)
	private String sido; // 시/도

	@Column(name = "sigungu", nullable = false, length = 20)
	private String sigungu; // 시/군/구

	@Column(name = "road_name", nullable = false, length = 100)
	private String roadName; // 도로명

	@Column(name = "building_num", nullable = false, length = 10)
	private String buildingNum; // 건물번호

	@Column(name = "detail", length = 100)
	private String detail; // 상세주소

	@Column(name = "full_address", nullable = false, columnDefinition = "TEXT")
	private String fullAddress; // 전체 도로명 주소 (표시용)

	@Column(name = "latitude")
	private Double latitude; // 위도 (추후 위경도 기능 확장용)

	@Column(name = "longitude")
	private Double longitude; // 경도 (추후 위경도 기능 확장용)

	@Builder
	public Location(Schedule schedule, String name, String sido, String sigungu,
					String roadName, String buildingNum, String detail, String fullAddress,
					Double latitude, Double longitude) {
		this.schedule = schedule;
		this.name = name;
		this.sido = sido;
		this.sigungu = sigungu;
		this.roadName = roadName;
		this.buildingNum = buildingNum;
		this.detail = detail;
		this.fullAddress = fullAddress;
		this.latitude = latitude;
		this.longitude = longitude;
	}
}
