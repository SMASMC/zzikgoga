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

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cost_transfer")
public class CostTransfer extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "cost_settlement_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_cost_transfer_settlement")
	)
	private CostSettlement costSettlement;

	@Column(name = "target_member_id", nullable = false)
	private Long targetMemberId;

	@Column(name = "amount", nullable = false)
	private Integer amount;

	@Column(name = "is_to_service", nullable = false)
	private Boolean isToService;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "transfer_status DEFAULT 'TRANSFERRING'")
	private TransferStatus status;

	@Column(name = "error_code", length = 100)
	private String errorCode;

	@Column(name = "bank_transaction_id", length = 1000, unique = true)
	private String bankTransactionId;

	@Column(name = "retry_count", nullable = false)
	private Integer retryCount;

	@Builder
	public CostTransfer(CostSettlement costSettlement, Long targetMemberId, Integer amount,
						Boolean isToService, TransferStatus status, String errorCode,
						String bankTransactionId, Integer retryCount) {
		this.costSettlement = costSettlement;
		this.targetMemberId = targetMemberId;
		this.amount = amount;
		this.isToService = isToService;
		this.status = status != null ? status : TransferStatus.TRANSFERRING;
		this.errorCode = errorCode;
		this.bankTransactionId = bankTransactionId;
		this.retryCount = retryCount != null ? retryCount : 0;
	}

	public void setCostSettlement(CostSettlement costSettlement) {
		this.costSettlement = costSettlement;
	}

	public void updateStatus(TransferStatus status) {
		this.status = status;
	}

	public void updateErrorCode(String errorCode) {
		this.errorCode = errorCode;
	}

	public void updateBankTransactionId(String bankTransactionId) {
		this.bankTransactionId = bankTransactionId;
	}

	public void incrementRetryCount() {
		this.retryCount++;
	}
}