package com.zzik.backend.domain.cost.entity;

public enum TransferStatus {
	PENDING,
	CHECKING_BALANCE,
	BALANCE_OK,
	TRANSFERRING,
	COMPLETED,
	FAILED
}