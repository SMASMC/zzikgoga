package com.zzik.backend.domain.memory.enums;

/**
 * 추억 상태 타입
 * PostgreSQL의 memory_status_type ENUM에 대응
 */
public enum MemoryStatus {
	ONPROCESS,  // 작성 중
	COMPLETED   // 완료
}
