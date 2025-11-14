package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
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
 * 정산 네트워크 상세 엔티티
 * <p>
 * 실제 송금 내역을 관리합니다. (서비스 계좌 경유)
 * 예: A → 서비스 계좌 → B
 * - Detail 1: A → 서비스 (is_to_service = true)
 * - Detail 2: 서비스 → B (is_to_service = false)
 * </p>
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "settlement_network_detail")
public class SettlementNetworkDetail extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 정산 네트워크 (송금 관계) */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "settlement_network_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_settlement_network_detail_network")
	)
	private SettlementNetwork settlementNetwork;

	/** 대상 회원 ID (송금 대상) */
	@Column(name = "target_member_id", nullable = false)
	private Long targetMemberId;

	/** 송금 금액 */
	@Column(name = "amount", nullable = false)
	private Integer amount;

	/** 서비스 계좌로의 송금 여부 (true: 회원→서비스, false: 서비스→회원) */
	@Column(name = "is_to_service", nullable = false)
	private Boolean isToService;

	/** 송금 상태 */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "network_detail_status DEFAULT 'TRANSFERRING'")
	private NetworkDetailStatus status;

	/** 외부 API 에러 코드 (FAILED 상태일 때 값 존재) */
	@Column(name = "error_code", length = 100)
	private String errorCode;

	/** 은행 거래 ID (멱등성 보장, 중복 요청 방지) */
	@Column(name = "bank_transaction_id", length = 1000)
	private String bankTransactionId;

	/** 재시도 횟수 */
	@Column(name = "retry_count", nullable = false)
	private Integer retryCount;

	@Builder
	public SettlementNetworkDetail(SettlementNetwork settlementNetwork, Long targetMemberId,
									Integer amount, Boolean isToService, NetworkDetailStatus status,
									String errorCode, String bankTransactionId, Integer retryCount) {
		this.settlementNetwork = settlementNetwork;
		this.targetMemberId = targetMemberId;
		this.amount = amount;
		this.isToService = isToService;
		this.status = status != null ? status : NetworkDetailStatus.TRANSFERRING;
		this.errorCode = errorCode;
		this.bankTransactionId = bankTransactionId;
		this.retryCount = retryCount != null ? retryCount : 0;
	}

	/**
	 * SettlementNetwork 설정 (양방향 관계)
	 */
	public void setSettlementNetwork(SettlementNetwork settlementNetwork) {
		this.settlementNetwork = settlementNetwork;
	}

	/**
	 * 송금 상태 변경
	 */
	public void updateStatus(NetworkDetailStatus status) {
		this.status = status;
	}

	/**
	 * 에러 코드 설정
	 */
	public void updateErrorCode(String errorCode) {
		this.errorCode = errorCode;
	}

	/**
	 * 은행 거래 ID 설정
	 */
	public void updateBankTransactionId(String bankTransactionId) {
		this.bankTransactionId = bankTransactionId;
	}

	/**
	 * 재시도 횟수 증가
	 */
	public void incrementRetryCount() {
		this.retryCount++;
	}
}
