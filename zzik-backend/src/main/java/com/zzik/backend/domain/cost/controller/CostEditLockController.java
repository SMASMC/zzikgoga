package com.zzik.backend.domain.cost.controller;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.cost.api.LockApi;
import com.zzik.backend.domain.cost.dto.response.EditStatusResponse;
import com.zzik.backend.domain.cost.dto.response.LockAcquireResponse;
import com.zzik.backend.domain.cost.dto.response.LockRenewResponse;
import com.zzik.backend.domain.cost.dto.response.LockReleaseResponse;
import com.zzik.backend.domain.cost.service.CostEditLockService;
import com.zzik.backend.global.presentation.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/cost")
public class CostEditLockController implements LockApi {

	private final CostEditLockService lockService;

	private static final ZoneId KST = ZoneId.of("Asia/Seoul");
	private static final DateTimeFormatter ISO_LOCAL_KST =
		DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(KST);

    @Override
    public ResponseEntity<ApiResponse<EditStatusResponse>> getEditStatus(
        @PathVariable Long tripId,
        @PathVariable Long costId
    ) {
		EditStatusResponse content = lockService.getEditStatus(tripId, costId);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}

	@Override
	public ResponseEntity<ApiResponse<LockAcquireResponse>> acquireEditLock(Long tripId, Long costId) {
		boolean acquired = lockService.tryAcquire(tripId, costId);

		String expireAt = acquired
			? ISO_LOCAL_KST.format(Instant.ofEpochMilli(
			System.currentTimeMillis() + CostEditLockService.LOCK_TTL_SECONDS * 1000))
			: null;

		LockAcquireResponse body = LockAcquireResponse.builder()
			.costId(costId)
			.lockAcquired(acquired)
			.lockExpireAt(expireAt)
			.build();

		return ResponseEntity.ok(ApiResponse.createSuccess(body));
	}

	@Override
	public ResponseEntity<ApiResponse<LockRenewResponse>> renewEditLock(Long tripId, Long costId) {
		// 소유자 여부를 안전하게 확인
		EditStatusResponse status = lockService.getEditStatus(tripId, costId);
		boolean isOwner = status.isEditing() && status.isCanEdit();

		boolean renewed = false;
		if (isOwner) {
			lockService.renew(tripId, costId);
			renewed = true;
		}

		String expireAt = renewed
			? ISO_LOCAL_KST.format(Instant.ofEpochMilli(
			System.currentTimeMillis() + CostEditLockService.LOCK_TTL_SECONDS * 1000))
			: null;

		LockRenewResponse body = LockRenewResponse.builder()
			.costId(costId)
			.renewed(renewed)
			.lockExpireAt(expireAt)
			.build();

		return ResponseEntity.ok(ApiResponse.createSuccess(body));
	}

	@Override
	public ResponseEntity<ApiResponse<LockReleaseResponse>> releaseEditLock(Long tripId, Long costId) {
		boolean released = lockService.release(tripId, costId);
		LockReleaseResponse body = LockReleaseResponse.builder()
			.costId(costId)
			.released(released)
			.build();
		return ResponseEntity.ok(ApiResponse.createSuccess(body));
	}
}
