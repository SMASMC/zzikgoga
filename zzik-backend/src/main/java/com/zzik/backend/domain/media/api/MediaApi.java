package com.zzik.backend.domain.media.api;

import com.zzik.backend.domain.media.dto.response.PhotoListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Media", description = "사진 및 미디어 API")
public interface MediaApi {

	@Operation(
		summary = "여행 사진 업로드 (다중)",
		description = "특정 여행(tripId)에 사진을 업로드합니다. (50MB 제한, jpg, png, gif, webp 등)"
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "사진 업로드 성공",
			responseClass = PhotoUploadResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_FOUND_DATA),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FORBIDDEN),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FILE_TOO_LARGE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_FILE_EXTENSION),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FILE_UPLOAD_FAILED)
		}
	)
	ResponseEntity<ApiResponse<PhotoUploadListResponse>> uploadPhotos(
		@Parameter(description = "여행의 고유 ID", example = "13")
		@PathVariable Long tripId,

		@Parameter(
			description = "업로드할 이미지 파일 (multipart/form-data)",
			content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
				schema = @Schema(type = "string", format = "binary"))
		)
		@RequestPart("files") MultipartFile[] file
	);

	@Operation(
		summary = "여행 사진 목록 조회 (커서 기반)",
		description = "특정 여행(tripId)에 업로드된 사진 목록을 페이지네이션으로 조회합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "사진 목록 조회 성공",
			responseClass = PhotoListResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_FOUND_RESOURCE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FORBIDDEN)
		}
	)
	ResponseEntity<ApiResponse<PhotoListResponse>> getPhotos(
		@Parameter(description = "여행의 고유 ID", example = "123")
		@PathVariable Long tripId,

		@Parameter(description = "다음 페이지 조회를 위한 커서 ID. (첫 페이지는 null)", example = "10")
		@RequestParam(required = false) Long cursor,

		@Parameter(description = "페이지당 사진 개수", example = "20")
		@RequestParam(defaultValue = "20") int size
	);
}
