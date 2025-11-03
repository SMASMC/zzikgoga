package com.zzik.backend.domain.plan.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trip extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_id", nullable = false, foreignKey = @ForeignKey(foreignKeyDefinition = "FOREIGN KEY (owner_id) REFERENCES member(id) ON DELETE CASCADE"))
	private Member owner;

	@Column(name = "title", nullable = false, length = 100)
	private String title;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Column(name = "male_count", nullable = false)
	private Short maleCount = 0;

	@Column(name = "female_count", nullable = false)
	private Short femaleCount = 0;

	@Column(name = "is_cost_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
	private Boolean isCostCompleted = false;

	@OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<TripMember> tripMembers = new ArrayList<>();

	@OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Schedule> schedules = new ArrayList<>();

	@Builder
	public Trip(
		Member owner,
		String title,
		LocalDate startDate,
		LocalDate endDate,
		Short maleCount,
		Short femaleCount,
		Boolean isCostCompleted
	) {
		this.owner = owner;
		this.title = title;
		this.startDate = startDate;
		this.endDate = endDate;
		this.maleCount = maleCount != null ? maleCount : 0;
		this.femaleCount = femaleCount != null ? femaleCount : 0;
		this.isCostCompleted = isCostCompleted != null ? isCostCompleted : false;
	}
}
