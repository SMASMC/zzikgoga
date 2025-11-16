package com.zzik.backend.domain.cost.entity;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.annotations.JdbcType;

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

/**
 * 여행 정산 엔티티
 * <p>
 * 여행별 정산 정보를 관리합니다.
 * 정산이 시작되면 로우가 생성되고 상태가 IN_PROGRESSING로 설정됩니다.
 * </p>
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "settlement")
public class Settlement extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 여행 ID (로깅용, 외래키 제약 없음) */
	@Column(name = "trip_id", nullable = false)
	private Long tripId;

	/** 정산 버전 (정산 내용 변경 시 증가) */
	@Column(name = "cost_version", nullable = false)
	private Short costVersion;

	/** 정산 상태 */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "settlement_status DEFAULT 'IN_PROGRESSING'")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private SettlementStatus status;

	/** 실패 횟수 */
	@Column(name = "fail_count", nullable = false)
	private Integer failCount;

	/** 다음 재시도 시각 */
	@Column(name = "next_retry_at")
	private LocalDateTime nextRetryAt;

	/** 재시도 횟수 */
	@Column(name = "retry_count", nullable = false)
	private Integer retryCount;

	/** 실제 은행 거래 목록 */
	@OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<SettlementTransaction> settlementTransactions;

	/** 회원별 송금 요약 목록 */
	@OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<SettlementMemberTransfer> settlementMemberTransfers;

	@Builder
	public Settlement(Long tripId, Short costVersion, SettlementStatus status,
					  Integer failCount, LocalDateTime nextRetryAt, Integer retryCount) {
		this.tripId = tripId;
		this.costVersion = costVersion != null ? costVersion : 1;
		this.status = status != null ? status : SettlementStatus.IN_PROGRESSING;
		this.failCount = failCount != null ? failCount : 0;
		this.nextRetryAt = nextRetryAt;
		this.retryCount = retryCount != null ? retryCount : 0;
	}

	/**
	 * 정산 상태 변경
	 */
	public void updateStatus(SettlementStatus status) {
		this.status = status;
	}

	/**
	 * 실패 횟수 증가
	 */
	public void incrementFailCount() {
		this.failCount++;
	}

	/**
	 * 재시도 횟수 증가
	 */
	public void incrementRetryCount() {
		this.retryCount++;
	}

	/**
	 * 다음 재시도 시각 설정
	 */
	public void updateNextRetryAt(LocalDateTime nextRetryAt) {
		this.nextRetryAt = nextRetryAt;
	}

	/**
	 * 정산 버전 증가
	 */
	public void incrementCostVersion() {
		this.costVersion++;
	}
}