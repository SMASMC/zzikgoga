package com.zzik.backend.domain.plan.dto.response;

import java.util.List;

import com.zzik.backend.global.pagination.PageInfoResponse;

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
public class TripListResponse {
	private List<TripSummaryResponse> trip;
	private PageInfoResponse pageInfo;
}
