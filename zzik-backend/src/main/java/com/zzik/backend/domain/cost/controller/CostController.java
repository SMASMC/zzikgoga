// src/main/java/com/zzik/backend/domain/cost/controller/CostController.java
package com.zzik.backend.domain.cost.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.api.CostApi;
import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
import com.zzik.backend.domain.cost.dto.response.CostCalculateResponse;
import com.zzik.backend.domain.cost.dto.response.CostItemDetailResponse;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.domain.cost.service.CostService;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/cost")
public class CostController implements CostApi {

	private final CostService costService;

	@Override
	public ResponseEntity<ApiResponse<ReceiptOcrResponse>> uploadReceiptAndSave(
		@PathVariable Long tripId,
		@RequestPart("file") MultipartFile file
	) {
		ReceiptOcrResponse result = costService.ocrAndCreate(tripId, file);
		return ResponseEntity.ok(ApiResponse.createSuccess(result));
	}

	// 정산 직접 입력
	@Override
	public ResponseEntity<ApiResponse<Map<String, Long>>> createCost(
		@PathVariable Long tripId,
		@RequestBody SaveCostRequest request
	) {
		Long id = costService.createCost(tripId, request, null);
		Map<String, Long> content = Map.of("costId", id);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}

	@Override
	public ResponseEntity<ApiResponse<CostItemDetailResponse>> getCostDetail(
		@PathVariable Long tripId,
		@PathVariable Long costId
	) {
		CostItemDetailResponse detail = costService.getCostDetail(tripId, costId);
		return ResponseEntity.ok(ApiResponse.createSuccess(detail));
	}

	@Override
	public ResponseEntity<ApiResponse<CostCalculateResponse>> calculate(Long tripId) {
		Long userId = SecurityUtil.getCurrentMemberId();
		CostCalculateResponse content = costService.calculate(tripId, userId);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}
}
