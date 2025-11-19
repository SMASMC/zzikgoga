package com.zzik.backend.domain.cost.entity;

import java.util.Map;

import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
 * 회원별 정산 송금 요약 엔티티
 * <p>
 * Redis에서 계산된 정산 결과의 스냅샷을 저장합니다.
 * 사용자 API에서 "내가 얼마를 보내야/받아야 하는지" 조회 시 사용됩니다.
 * </p>
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "settlement_member_transfer")
public class SettlementMemberTransfer extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 정산 정보 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "settlement_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_settlement_member_transfer_settlement")
	)
	private Settlement settlement;

	/** 회원 ID */
	@Column(name = "member_id", nullable = false)
	private Long memberId;

	/** 보낼 총액 (Redis에서 가져온 스냅샷) */
	@Column(name = "send_amount", nullable = false)
	private Long sendAmount;

	/** 받을 총액 (Redis에서 가져온 스냅샷) */
	@Column(name = "receive_amount", nullable = false)
	private Long receiveAmount;

	/** 순액 (receiveAmount - sendAmount) */
	@Column(name = "net_amount", nullable = false)
	private Long netAmount;

	/** Redis sendMap 스냅샷 (receiverId -> amount) */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "send_details", columnDefinition = "jsonb")
	private Map<Long, Long> sendDetails;

	/** Redis receiveMap 스냅샷 (senderId -> amount) */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "receive_details", columnDefinition = "jsonb")
	private Map<Long, Long> receiveDetails;

	/** 송금 상태 (보낼 금액이 있을 때만) */
	@Enumerated(EnumType.STRING)
	@Column(name = "send_status", columnDefinition = "network_detail_status")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private NetworkDetailStatus sendStatus;

	/** 송금 실패 시 에러 코드 */
	@Column(name = "send_error_code", length = 100)
	private String sendErrorCode;

	/** 수신 상태 (받을 금액이 있을 때만) */
	@Enumerated(EnumType.STRING)
	@Column(name = "receive_status", columnDefinition = "network_detail_status")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private NetworkDetailStatus receiveStatus;

	/** 수신 실패 시 에러 코드 */
	@Column(name = "receive_error_code", length = 100)
	private String receiveErrorCode;

	@Builder
	public SettlementMemberTransfer(Settlement settlement, Long memberId,
									 Long sendAmount, Long receiveAmount, Long netAmount,
									 Map<Long, Long> sendDetails, Map<Long, Long> receiveDetails,
									 NetworkDetailStatus sendStatus, String sendErrorCode,
									 NetworkDetailStatus receiveStatus, String receiveErrorCode) {
		this.settlement = settlement;
		this.memberId = memberId;
		this.sendAmount = sendAmount != null ? sendAmount : 0L;
		this.receiveAmount = receiveAmount != null ? receiveAmount : 0L;
		this.netAmount = netAmount;
		this.sendDetails = sendDetails;
		this.receiveDetails = receiveDetails;
		this.sendStatus = sendStatus;
		this.sendErrorCode = sendErrorCode;
		this.receiveStatus = receiveStatus;
		this.receiveErrorCode = receiveErrorCode;
	}

	/**
	 * Settlement 설정 (양방향 관계)
	 */
	public void setSettlement(Settlement settlement) {
		this.settlement = settlement;
	}

	/**
	 * 송금 상태 변경
	 */
	public void updateSendStatus(NetworkDetailStatus sendStatus) {
		this.sendStatus = sendStatus;
	}

	/**
	 * 송금 에러 코드 설정
	 */
	public void updateSendErrorCode(String sendErrorCode) {
		this.sendErrorCode = sendErrorCode;
	}

	/**
	 * 수신 상태 변경
	 */
	public void updateReceiveStatus(NetworkDetailStatus receiveStatus) {
		this.receiveStatus = receiveStatus;
	}

	/**
	 * 수신 에러 코드 설정
	 */
	public void updateReceiveErrorCode(String receiveErrorCode) {
		this.receiveErrorCode = receiveErrorCode;
	}
}
