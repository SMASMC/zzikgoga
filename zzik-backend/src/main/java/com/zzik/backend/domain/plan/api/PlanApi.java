package com.zzik.backend.domain.plan.api;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.request.InviteAcceptRequest;
import com.zzik.backend.domain.plan.dto.response.ExitTripResponse;
import com.zzik.backend.domain.plan.dto.response.InviteAcceptResponse;
import com.zzik.backend.domain.plan.dto.response.InviteLinkResponse;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Plan")
@RequestMapping("/plan")
public interface PlanApi {

	@Operation(summary = "여행 목록 조회")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "여행 목록 조회 성공",
			responseClass = TripListResponse.class
		),
		errors = {
		}
	)
    @GetMapping
    ResponseEntity<ApiResponse<TripListResponse>> getTripList(
        @RequestParam(required = false) Long cursor,
        @RequestParam(defaultValue = "20") int size
    );

	@Operation(summary = "여행 생성")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "여행 생성 성공 (생성된 여행 ID 반환)",
			responseClass = Long.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_COMPANION),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_THEMA),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.PLAN_INVALID_TITLE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.PLAN_INVALID_DATE_RANGE)
		}
	)
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	ResponseEntity<ApiResponse<Map<String, Long>>> createTrip(@RequestBody CreateTripRequest request);

	@Operation(summary = "여행 초대 링크 생성")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "초대 링크 생성 완료",
			responseClass = InviteLinkResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FORBIDDEN_TRIP),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.PLAN_INVALID_DATE_RANGE)
		}
	)
	@PostMapping("/{tripId}/invite")
	ResponseEntity<ApiResponse<InviteLinkResponse>> createInvite(@PathVariable Long tripId);

	@Operation(summary = "여행 초대 수락(검증+멤버추가)")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "초대 수락 완료(혹은 이미 멤버)",
			responseClass = InviteAcceptResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.EMPTY_ACCESS_TOKEN),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.MALFORMED_TOKEN),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.EXPIRED_ACCESS_TOKEN)
		}
	)
	@PostMapping(value = "/invite/accept", consumes = MediaType.APPLICATION_JSON_VALUE)
	ResponseEntity<ApiResponse<InviteAcceptResponse>> acceptInvite(@RequestBody InviteAcceptRequest request);

	@Operation(summary = "여행 나가기")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "여행 나가기 성공",
			responseClass = String.class   // 성공 메시지나 상태 코드 반환
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_TRIP_MEMBER),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN)
		}
	)
	@DeleteMapping(value = "/exit/{tripId}")
	ResponseEntity<ApiResponse<ExitTripResponse>> exitTrip(@PathVariable Long tripId);
}
