package com.zzik.backend.domain.cost.entity;

public enum SettlementStatus {
	IN_PROGRESSING,
	PENDING,
	COMPLETE,
	/** 서비스계좌로 이체 도중 에러가 생김(서비스 기준으로 받는것이라서 RECEIVE) */
	PARTITIALLY_FAILED_AT_RECEIVE,
	/** 서비스계좌에서 각자의 계좌로 이체 도중 에러가 생김(서비스 기준으로 주는 것이라서 SEND) */
	PARTITIALLY_FAILED_AT_SEND,
	FAILED
}
