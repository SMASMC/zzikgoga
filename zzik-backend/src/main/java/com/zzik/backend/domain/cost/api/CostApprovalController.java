package com.zzik.backend.domain.cost.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;

import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.global.presentation.ApiResponse;

@RequestMapping("/cost")
public class CostApprovalController implements CostApprovalApi {
	@Override
	public ResponseEntity<ApiResponse<CostApprovalResponse>> costApprove(Long tripId, CostApprovalRequest request) {
		return null;
	}
}
