package com.zzik.backend.domain.cost.entity;

import java.util.List;

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

/**
 * 정산 네트워크 엔티티
 * <p>
 * 송금자(sender)와 수신자(receiver) 간의 송금 관계를 나타냅니다.
 * 실제 송금은 서비스 계좌를 경유하므로 settlement_network_detail에서 관리합니다.
 * </p>
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "settlement_network")
public class SettlementNetwork extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 정산 정보 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "settlement_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_settlement_network_settlement")
	)
	private Settlement settlement;

	/** 송금자 ID */
	@Column(name = "sender_id", nullable = false)
	private Long senderId;

	/** 수신자 ID */
	@Column(name = "receive_id", nullable = false)
	private Long receiveId;

	/** 송금 금액 */
	@Column(name = "amount", nullable = false)
	private Integer amount;

	/** 송금 상세 목록 (서비스 계좌 경유) */
	@OneToMany(mappedBy = "settlementNetwork", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<SettlementNetworkDetail> settlementNetworkDetails;

	@Builder
	public SettlementNetwork(Settlement settlement, Long senderId, Long receiveId, Integer amount) {
		this.settlement = settlement;
		this.senderId = senderId;
		this.receiveId = receiveId;
		this.amount = amount;
	}

	/**
	 * Settlement 설정 (양방향 관계)
	 */
	public void setSettlement(Settlement settlement) {
		this.settlement = settlement;
	}
}