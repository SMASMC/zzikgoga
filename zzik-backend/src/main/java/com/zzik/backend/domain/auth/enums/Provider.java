package com.zzik.backend.domain.auth.enums;

/**
 * OAuth 제공자 타입
 * PostgreSQL의 provider_type ENUM에 대응
 */
public enum Provider {
	KAKAO,   // 카카오 OAuth
	GOOGLE,  // 구글 OAuth
	NAVER    // 네이버 OAuth
}
