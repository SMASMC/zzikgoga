package com.zzik.backend.domain.plan.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.plan.api.PlanApi;
import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.domain.plan.service.PlanService;
import com.zzik.backend.global.presentation.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PlanController implements PlanApi {

	private final PlanService planService;

	@Override
	public ResponseEntity<ApiResponse<TripListResponse>> getTripList() {
		Long ownerId = 3L; // JWT 연결되면 수정
		TripListResponse list = planService.getTripList(ownerId);
		return ResponseEntity.ok(ApiResponse.createSuccess(list));
	}

	@Override
	public ResponseEntity<ApiResponse<Map<String, Long>>> createTrip(CreateTripRequest request) {
		Long ownerId = 3L; // JWT 되면 수정
		Long tripId = planService.createTrip(request, ownerId);
		return ResponseEntity.ok(ApiResponse.createSuccess(Map.of("tripId", tripId)));
	}
}
