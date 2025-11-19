package com.zzik.backend.domain.plan.enums;

/**
 * 예산 카테고리 타입
 * PostgreSQL의 budget_category_type ENUM에 대응
 */
public enum BudgetCategory {
	STAY,       // 숙박
	FOOD,       // 식비
	TRANSPORT,  // 교통
	SHOPPING,   // 쇼핑
	LEISURE,    // 여가
	ETC         // 기타
}
