package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 여행 엔티티
 * 회원이 생성한 여행 정보를 관리합니다.
 */
@Entity
@Table(name = "trip")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trip extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY) // PostgreSQL BIGSERIAL
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩으로 N+1 문제 방지
	@JoinColumn(name = "owner_id", nullable = false)
	private Member owner; // 여행 소유자 (FK to member.id)

	@Column(name = "title", nullable = false, length = 100)
	private String title; // 여행 제목

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate; // 여행 시작일

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate; // 여행 종료일

	@Column(name = "male_count", nullable = false, columnDefinition = "SMALLINT DEFAULT 0")
	private Short maleCount = 0; // 남성 인원수

	@Column(name = "female_count", nullable = false, columnDefinition = "SMALLINT DEFAULT 0")
	private Short femaleCount = 0; // 여성 인원수

	@Column(name = "is_cost_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
	private Boolean isCostCompleted = false; // 정산 완료 여부

	// 양방향 연관관계 - 여행에 속한 멤버들
	@OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<TripMember> tripMembers = new ArrayList<>();

	// 양방향 연관관계 - 여행에 속한 일정들
	@OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Schedule> schedules = new ArrayList<>();

	@Builder
	public Trip(Member owner, String title, LocalDate startDate, LocalDate endDate,
				Short maleCount, Short femaleCount, Boolean isCostCompleted) {
		this.owner = owner;
		this.title = title;
		this.startDate = startDate;
		this.endDate = endDate;
		this.maleCount = maleCount != null ? maleCount : 0;
		this.femaleCount = femaleCount != null ? femaleCount : 0;
		this.isCostCompleted = isCostCompleted != null ? isCostCompleted : false;
	}
}
