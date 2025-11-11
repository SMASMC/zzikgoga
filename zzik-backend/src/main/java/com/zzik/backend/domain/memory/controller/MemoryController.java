package com.zzik.backend.domain.memory.controller;

import com.zzik.backend.domain.memory.api.MemoryApi;
import com.zzik.backend.domain.memory.dto.request.MemorySaveRequest;
import com.zzik.backend.domain.memory.dto.response.MemoryDetailResponse;
import com.zzik.backend.domain.memory.dto.response.MemoryPdfResponse;
import com.zzik.backend.domain.memory.service.MemoryService;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.utils.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/memory")
public class MemoryController implements MemoryApi {

	private final MemoryService memoryService;

	@Override
	@PutMapping("/{tripId}")
	public ResponseEntity<ApiResponse<MemoryDetailResponse>> saveMemory(
		@PathVariable Long tripId,
		@RequestBody @Valid MemorySaveRequest request
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		MemoryDetailResponse response = memoryService.saveMemory(tripId, memberId, request);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}

	@Override
	@GetMapping("/{tripId}")
	public ResponseEntity<ApiResponse<MemoryDetailResponse>> getMyMemory(
		@PathVariable Long tripId
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		MemoryDetailResponse response = memoryService.getMyMemory(tripId, memberId);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}

	@Override
	@PostMapping("/{tripId}/convert/pdf")
	public ResponseEntity<ApiResponse<MemoryPdfResponse>> convertMemoryToPdf(
		@PathVariable Long tripId
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		MemoryPdfResponse response = memoryService.convertMemoryToPdf(tripId, memberId);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}
}
