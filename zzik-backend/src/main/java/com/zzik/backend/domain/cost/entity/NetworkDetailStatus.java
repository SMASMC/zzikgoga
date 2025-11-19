package com.zzik.backend.domain.cost.entity;

/**
 * 송금 상세 상태 ENUM
 * <p>
 * settlement_network_detail 테이블의 status 컬럼과 매핑됩니다.
 * </p>
 */
public enum NetworkDetailStatus {
	/** 대기 중 */
	PENDING,

	/** 송금 진행 중 */
	TRANSFERRING,

	/** 송금 완료 */
	COMPLETED,

	/** 송금 실패 */
	FAILED
}