package com.zzik.backend.domain.cost.entity;

import java.time.LocalDateTime;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cost")
public class Cost extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "trip_id", nullable = false)
	private Long tripId;
	@Column(name = "created_by", nullable = false)
	private Long createdBy;
	@Column(name = "payer_id", nullable = false)
	private Long payerId;

	@Column(name = "paid_at", columnDefinition = "TEXT", nullable = false)
	private String paidAt;

	@Column(name = "place", length = 200, nullable = false)
	private String place;

	@Column(name = "total_amount", nullable = false)
	private Long totalAmount;

	@Column(name = "memo", columnDefinition = "TEXT")
	private String memo;

	@Column(name = "receipt", columnDefinition = "TEXT")
	private String receipt;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;
}
