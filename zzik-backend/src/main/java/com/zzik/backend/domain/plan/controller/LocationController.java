package com.zzik.backend.domain.plan.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.plan.api.LocationApi;
import com.zzik.backend.domain.plan.api.LocationSearchResponse;
import com.zzik.backend.domain.plan.dto.LocationSearchSortType;
import com.zzik.backend.global.presentation.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/plan")
@RequiredArgsConstructor
public class LocationController implements LocationApi {
	@Override
	@GetMapping("/location")
	public ResponseEntity<ApiResponse<LocationSearchResponse>> getLocationList(String query, int limit,
		LocationSearchSortType sort, double lat, double lng) {
		return ResponseEntity.ok(ApiResponse.createSuccess(
			null
		));
	}
}
