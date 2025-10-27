package com.zzik.backend.domain.memory.enums;

/**
 * 저장소 타입
 * PostgreSQL의 storage_type_type ENUM에 대응
 */
public enum StorageType {
	S3,       // AWS S3
	ARWEAVE   // Arweave 분산 저장소
}
