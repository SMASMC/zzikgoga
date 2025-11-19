package com.zzik.backend.domain.plan.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripCursorResponse {
	private List<TripSummaryResponse> trips;
	private Long nextCursor; // 다음 요청에 사용할 커서 (마지막 trip의 ID)
	private boolean hasMore; // 더 불러올 데이터가 있는지
	private long totalCount; // 전체 여행 수
}
