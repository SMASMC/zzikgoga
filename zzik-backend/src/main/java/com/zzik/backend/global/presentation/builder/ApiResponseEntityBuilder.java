package com.zzik.backend.global.presentation.builder;

import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.exception.VoException;
import com.zzik.backend.global.presentation.ApiResponse;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

/**
 * API 응답을 포함하는 ResponseEntity 생성 클래스.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponseEntityBuilder {

	public static ResponseEntity<Object> createValidationErrorEntity(Map<String, String> errors) {
		return ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(ApiResponse.createValidationError(errors));
	}

	public static <T> ResponseEntity<ApiResponse<T>> createErrorResponseEntityFromException(BusinessException ex) {
		return ResponseEntity
			.status(ex.getHttpStatus())
			.body(ApiResponse.createErrorFromException(ex));
	}

	public static ResponseEntity<Object> createErrorResponseEntity(ExceptionCode ec) {
		return ResponseEntity
			.status(ec.getHttpStatus())
			.body(ApiResponse.createError(ec));
	}

	public static ResponseEntity<ApiResponse<String>> createVoErrorEntity(VoException ex) {
		return ResponseEntity
			.status(HttpStatus.UNPROCESSABLE_ENTITY)
			.body(ApiResponse.createVoError(ex));
	}

	public static ResponseEntity<Object> createServerErrorEntity() {
		return ResponseEntity
			.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(ApiResponse.createServerError());
	}
}
