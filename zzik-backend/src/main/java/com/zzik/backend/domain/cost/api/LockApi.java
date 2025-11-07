package com.zzik.backend.domain.cost.api;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import com.zzik.backend.domain.cost.dto.response.EditStatusResponse;
import com.zzik.backend.domain.cost.dto.response.LockAcquireResponse;
import com.zzik.backend.domain.cost.dto.response.LockRenewResponse;
import com.zzik.backend.domain.cost.dto.response.LockReleaseResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Cost - Edit Lock")
public interface LockApi {

    @Operation(
        summary = "결제 항목 편집 상태 조회",
        description = "해당 결제 항목의 편집 잠금 상태 및 편집자 정보를 조회합니다."
    )
    @ApiResponseExplanations(
        success = @ApiSuccessResponseExplanation(
            description = "상태 조회 성공",
            responseClass = EditStatusResponse.class
        ),
        errors = {
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_TRIP),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_COST),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN)
        }
    )
    @GetMapping(
        value = "/{tripId}/{costId}/edit-status",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    ResponseEntity<ApiResponse<EditStatusResponse>> getEditStatus(
        @PathVariable Long tripId,
        @PathVariable Long costId
    );

    @Operation(
        summary = "결제 항목 편집 잠금 획득",
        description = "해당 결제 항목의 편집 권한을 획득합니다. 다른 사용자가 편집 중이면 false를 반환합니다."
    )
    @ApiResponseExplanations(
        success = @ApiSuccessResponseExplanation(
            description = "잠금 획득 성공 시 만료 예상 시각 반환",
            responseClass = LockAcquireResponse.class
        ),
        errors = {
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_TRIP),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_COST),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN)
        }
    )
    @PostMapping(
        value = "/{tripId}/{costId}/edit-lock",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    ResponseEntity<ApiResponse<LockAcquireResponse>> acquireEditLock(
        @PathVariable Long tripId,
        @PathVariable Long costId
    );

    @Operation(
        summary = "결제 항목 편집 TTL 갱신",
        description = "편집 페이지에 머무는 동안 TTL(5분)을 연장합니다. 본인 보유건만 갱신 가능합니다."
    )
    @ApiResponseExplanations(
        success = @ApiSuccessResponseExplanation(
            description = "갱신 성공 시 새로운 만료 예상 시각 반환",
            responseClass = LockRenewResponse.class
        ),
        errors = {
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_TRIP),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_COST),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN)
        }
    )
    @PutMapping(
        value = "/{tripId}/{costId}/edit-lock/renew",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    ResponseEntity<ApiResponse<LockRenewResponse>> renewEditLock(
        @PathVariable Long tripId,
        @PathVariable Long costId
    );

    @Operation(
        summary = "결제 항목 편집 잠금 해제",
        description = "본인이 보유 중인 잠금을 해제합니다. 이미 없거나 타인의 잠금이면 false 반환."
    )
    @ApiResponseExplanations(
        success = @ApiSuccessResponseExplanation(
            description = "해제 성공 여부 반환",
            responseClass = LockReleaseResponse.class
        ),
        errors = {
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_TRIP),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_COST),
            @ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN)
        }
    )
    @DeleteMapping(
        value = "/{tripId}/{costId}/edit-lock",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    ResponseEntity<ApiResponse<LockReleaseResponse>> releaseEditLock(
        @PathVariable Long tripId,
        @PathVariable Long costId
    );
}
