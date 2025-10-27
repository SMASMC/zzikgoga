package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.domain.plan.enums.BudgetCategory;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 예산 엔티티
 * 여행의 예산 정보를 관리합니다.
 */
@Entity
@Table(name = "budget")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Budget extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@Column(name = "date", nullable = false)
	private LocalDate date; // 예산 날짜

	@Enumerated(EnumType.STRING) // ENUM을 문자열로 저장 (PostgreSQL budget_category_type)
	@Column(name = "category", nullable = false)
	private BudgetCategory category; // 예산 카테고리

	@Column(name = "description", columnDefinition = "TEXT")
	private String description; // 설명

	@Column(name = "amount", nullable = false, precision = 12, scale = 0, columnDefinition = "NUMERIC(12,0) DEFAULT 0")
	private BigDecimal amount = BigDecimal.ZERO; // 금액

	@Builder
	public Budget(Trip trip, LocalDate date, BudgetCategory category,
				  String description, BigDecimal amount) {
		this.trip = trip;
		this.date = date;
		this.category = category;
		this.description = description;
		this.amount = amount != null ? amount : BigDecimal.ZERO;
	}
}
