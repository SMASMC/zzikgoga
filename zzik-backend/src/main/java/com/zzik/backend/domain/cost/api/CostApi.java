// src/main/java/com/zzik/backend/domain/cost/api/CostApi.java
package com.zzik.backend.domain.cost.api;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Cost")
public interface CostApi {

	@Operation(
		summary = "영수증 OCR 업로드",
		description = "영수증 이미지 업로드 시 자동으로 항목/금액/카드정보를 추출합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "영수증 OCR 분석 성공",
			responseClass = ReceiptOcrResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.RECEIPT_RECOGNIZE_FAIL)
		}
	)
	@PostMapping(
		value = "/{tripId}/receipt",
		consumes = MediaType.MULTIPART_FORM_DATA_VALUE
	)
	ResponseEntity<ApiResponse<ReceiptOcrResponse>> uploadReceipt(
		@PathVariable Long tripId,
		@RequestPart("file") MultipartFile file
	);
}
