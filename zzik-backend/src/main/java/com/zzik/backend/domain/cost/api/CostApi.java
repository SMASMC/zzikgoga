package com.zzik.backend.domain.cost.api;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
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
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.OCR_PROCESS_FAIL),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.UNSUPPORTED_IMAGE_TYPE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.UPLOAD_SIZE_EXCEEDED)
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

	@Operation(
		summary = "정산 등록 (최종 저장)",
		description = "OCR 결과 및 사용자가 입력한 항목을 기반으로 정산 내역을 저장합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "정산 등록 성공 (생성된 비용 ID 반환)",
			responseClass = Long.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_TRIP)
		}
	)
	@PostMapping(
		value = "/{tripId}",
		consumes = MediaType.APPLICATION_JSON_VALUE
	)
	ResponseEntity<ApiResponse<Map<String, Long>>> createCost(
		@PathVariable Long tripId,
		@RequestBody SaveCostRequest request
	);
}
