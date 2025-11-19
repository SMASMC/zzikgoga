package com.zzik.backend.domain.memory.enums;

/**
 * NFT 민팅 상태 타입
 * PostgreSQL의 mint_status_type ENUM에 대응
 */
public enum MintStatus {
	none,     // 민팅 안함
	pending,  // 민팅 대기 중
	success,  // 민팅 성공
	failed    // 민팅 실패
}
