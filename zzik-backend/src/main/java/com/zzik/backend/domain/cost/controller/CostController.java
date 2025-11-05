// src/main/java/com/zzik/backend/domain/cost/controller/CostController.java
package com.zzik.backend.domain.cost.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.api.CostApi;
import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.domain.cost.service.CostService;
import com.zzik.backend.global.presentation.ApiResponse;

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

	@Override
	public ResponseEntity<ApiResponse<Map<String, Long>>> createCost(
		@PathVariable Long tripId,
		SaveCostRequest request
	) {
		Long id = costService.createCost(tripId, request);
		Map<String, Long> content = Map.of("costId", id);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}
}
