package com.zzik.backend.domain.plan.dto;

public enum LocationSearchSortType {
	RELEVANCE, // 관련성 : q에 가장 일치한 순서
	DISTANCE; // 가까운순 : 쿼리파라미터로 온 위도 경도를 기준으로 가장 가까운 순 - 세미콜론 필수!

	public static final String DEFAULT_VALUE = "RELEVANCE";
}
