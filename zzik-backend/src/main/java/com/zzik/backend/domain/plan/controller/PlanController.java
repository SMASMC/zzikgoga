package com.zzik.backend.domain.plan.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.plan.api.PlanApi;
import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.request.InviteAcceptRequest;
import com.zzik.backend.domain.plan.dto.response.ExitTripResponse;
import com.zzik.backend.domain.plan.dto.response.InviteAcceptResponse;
import com.zzik.backend.domain.plan.dto.response.InviteLinkResponse;
import com.zzik.backend.domain.plan.dto.response.TripCursorResponse;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.domain.plan.service.PlanService;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PlanController implements PlanApi {

	private final PlanService planService;

	@Override
	public ResponseEntity<ApiResponse<TripListResponse>> getTripList(
		@RequestParam(defaultValue = "1") int page,
		@RequestParam(defaultValue = "7") int size
	) {
		Long ownerId = SecurityUtil.getCurrentMemberId();
		TripListResponse list = planService.getTripList(ownerId, page, size);
		return ResponseEntity.ok(ApiResponse.createSuccess(list));
	}

	@Override
	public ResponseEntity<ApiResponse<TripCursorResponse>> getTripListWithCursor(
		@RequestParam(required = false) Long cursor,
		@RequestParam(defaultValue = "10") int size
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		TripCursorResponse result = planService.getTripListWithCursor(memberId, cursor, size);
		return ResponseEntity.ok(ApiResponse.createSuccess(result));
	}

	@Override
	public ResponseEntity<ApiResponse<Map<String, Long>>> createTrip(CreateTripRequest request) {
		Long ownerId = SecurityUtil.getCurrentMemberId();
		Long tripId = planService.createTrip(request, ownerId);
		return ResponseEntity.ok(ApiResponse.createSuccess(Map.of("tripId", tripId)));
	}

	@Override
	public ResponseEntity<ApiResponse<InviteLinkResponse>> createInvite(Long tripId) {
		Long requesterId = SecurityUtil.getCurrentMemberId();
		String inviteUrl = planService.createInviteLink(tripId, requesterId);
		InviteLinkResponse body = InviteLinkResponse.builder()
			.inviteUrl(inviteUrl)
			.build();
		return ResponseEntity.ok(ApiResponse.createSuccess(body));
	}

	@Override
	public ResponseEntity<ApiResponse<InviteAcceptResponse>> acceptInvite(InviteAcceptRequest request) {
		Long memberId = SecurityUtil.getCurrentMemberId(); // 미로그인 시 예외
		String token = request != null ? request.getToken() : null;
		if (token == null || token.isBlank()) {
			return ResponseEntity
				.status(ExceptionCode.MALFORMED_TOKEN.getHttpStatus())
				.body(ApiResponse.createError(ExceptionCode.MALFORMED_TOKEN));
		}
		var res = planService.acceptInvite(token, memberId); // 이미 구현한 서비스 로직 재사용
		return ResponseEntity.ok(ApiResponse.createSuccess(res));
	}

	@Override
	public ResponseEntity<ApiResponse<ExitTripResponse>> exitTrip(@PathVariable Long tripId) {
		Long memberId = SecurityUtil.getCurrentMemberId();

		var res = planService.exitTrip(memberId, tripId);

		return ResponseEntity.ok(ApiResponse.createSuccess(res));
	}
}
