package com.zzik.backend.domain.cost.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.cost.api.CostEditApi;
import com.zzik.backend.domain.cost.dto.request.CostEditRequest;
import com.zzik.backend.domain.cost.dto.response.CostEditResponse;
import com.zzik.backend.domain.cost.service.CostEditService;
import com.zzik.backend.global.presentation.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/cost")
@RequiredArgsConstructor
public class CostEditController implements CostEditApi {

	private final CostEditService costEditService;

	@Override
	public ResponseEntity<ApiResponse<CostEditResponse>> editCost(
		Long tripId,
		Long costId,
		CostEditRequest request
	) {
		CostEditResponse result = costEditService.edit(tripId, costId, request);
		return ResponseEntity.ok(ApiResponse.createSuccess(result));
	}
}
