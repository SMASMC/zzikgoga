// src/main/java/com/zzik/backend/domain/cost/controller/CostController.java
package com.zzik.backend.domain.cost.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.api.CostApi;
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
	public ResponseEntity<ApiResponse<ReceiptOcrResponse>> uploadReceipt(
		Long tripId,
		MultipartFile file
	) {
		ReceiptOcrResponse result = costService.recognizeReceipt(tripId, file);
		return ResponseEntity.ok(ApiResponse.createSuccess(result));
	}
}
