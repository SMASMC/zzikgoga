package com.zzik.backend.domain.plan.api;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Plan")
@RequestMapping("/plan")
public interface PlanApi {

	@Operation(summary = "여행 목록 조회")
	@GetMapping
	ResponseEntity<ApiResponse<TripListResponse>> getTripList();

	@Operation(summary = "여행 생성")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	ResponseEntity<ApiResponse<Map<String, Long>>> createTrip(@RequestBody CreateTripRequest request);
}
