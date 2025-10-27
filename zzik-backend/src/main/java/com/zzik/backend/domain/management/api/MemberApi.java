package com.zzik.backend.domain.management.api;

/*
 * 견본용 코드 - 현재 주석처리됨
 * 실제 사용 시 주석 해제 필요
 */

/*
import com.zzik.backend.domain.management.dto.request.SignUpRequest;
import com.zzik.backend.domain.management.dto.response.SignUpResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Management")
public interface MemberApi {
	@Operation(
		summary = "신랑/신부 회원가입",
		description = "신랑/신부 회원가입을 수행합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "회원가입 성공\n" + "회원가입이 완료되면 성공합니다.",
			responseClass = SignUpResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.EXISTS_PHONE_NUMBER)
		}
	)
	ResponseEntity<ApiResponse<SignUpResponse>> registerBrideOrGroom(@RequestBody @Valid SignUpRequest request);
}
*/