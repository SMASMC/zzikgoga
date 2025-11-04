package com.zzik.backend.domain.plan.api;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "장소 검색 응답")
public record LocationSearchResponse(
	@Schema(description = "장소 목록")
	List<LocationItem> locations
) {
	@Schema(description = "장소 정보")
	public record LocationItem(
		@Schema(description = "장소명", example = "성심당 대전역점")
		String name,

		@Schema(description = "시도", example = "대전")
		String sido,

		@Schema(description = "시군구", example = "동구")
		String sigungu,

		@Schema(description = "도로명", example = "중앙로")
		String roadName,

		@Schema(description = "건물번호", example = "215")
		String buildingNum,

		@Schema(description = "상세주소", example = "대전역사 2F")
		String detail,

		@Schema(description = "전체 주소", example = "대전 동구 중앙로 215 대전역사 2F")
		String fullAddress,

		@Schema(description = "위도", example = "41.32543")
		Double latitude,

		@Schema(description = "경도", example = "10.3241")
		Double longitude,

		@Schema(description = "거리 (미터)", example = "102942")
		Integer distance
	) {
	}
}
