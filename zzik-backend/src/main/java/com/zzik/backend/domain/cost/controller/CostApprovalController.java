package com.zzik.backend.domain.cost.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.cost.api.CostApprovalApi;
import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.domain.cost.dto.response.CostApprovalStatusResponse;
import com.zzik.backend.domain.cost.service.CostApprovalService;
import com.zzik.backend.global.presentation.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/cost")
public class CostApprovalController implements CostApprovalApi {
	private final CostApprovalService costApprovalService;

	@PostMapping("/{tripId}/accept")
	@Override
	public ResponseEntity<ApiResponse<CostApprovalResponse>> costApprove(Long tripId, CostApprovalRequest request) {
		CostApprovalResponse response = costApprovalService.doCostApproval(tripId, request);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}

	@Override
	@GetMapping("/{tripId}/stat")
	public ResponseEntity<ApiResponse<CostApprovalStatusResponse>> getCostApproveStatus(Long tripId) {
		CostApprovalStatusResponse response = costApprovalService.getCostApproveStatuses(tripId);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}

}
