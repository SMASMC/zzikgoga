package com.zzik.backend.domain.cost.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cost_settlement")
public class CostSettlement extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "trip_id", nullable = false)
	private Long tripId;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "settlement_status DEFAULT 'IN_PROGRESSING'")
	private SettlementStatus status;

	@Column(name = "fail_count", nullable = false)
	private Integer failCount;

	@Column(name = "next_retry_at")
	private LocalDateTime nextRetryAt;

	@Column(name = "retry_count", nullable = false)
	private Integer retryCount;

	@OneToMany(mappedBy = "costSettlement", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CostTransfer> costTransfers;

	@Builder
	public CostSettlement(Long tripId, SettlementStatus status, Integer failCount,
						  LocalDateTime nextRetryAt, Integer retryCount) {
		this.tripId = tripId;
		this.status = status != null ? status : SettlementStatus.IN_PROGRESSING;
		this.failCount = failCount != null ? failCount : 0;
		this.nextRetryAt = nextRetryAt;
		this.retryCount = retryCount != null ? retryCount : 0;
	}

	public void updateStatus(SettlementStatus status) {
		this.status = status;
	}

	public void incrementFailCount() {
		this.failCount++;
	}

	public void incrementRetryCount() {
		this.retryCount++;
	}

	public void updateNextRetryAt(LocalDateTime nextRetryAt) {
		this.nextRetryAt = nextRetryAt;
	}
}