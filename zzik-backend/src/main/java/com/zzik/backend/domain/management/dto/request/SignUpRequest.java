package com.zzik.backend.domain.management.dto.request;

import com.zzik.backend.domain.management.enums.Gender;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "회원가입 요청 DTO")
public record SignUpRequest(
	@Schema(description = "사용자 이름", example = "철수")
	@NotBlank(message = "이름을 입력해주세요.")
	@Size(min = 2, max = 10, message = "이름은 2자 이상 10자 이하로 입력해주세요.")
	String name,

	@Schema(description = "사용자 전화번호", example = "010-1234-5678")
	@NotBlank(message = "전화번호를 입력해주세요.")
	@Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "올바른 전화번호 형식을 입력해주세요. (010-1234-5678)")
	String phone,

	@Schema(description = "사용자 비밀번호", example = "password123")
	@NotBlank(message = "비밀번호를 입력해주세요.")
	@Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)[a-zA-Z\\d]{8,15}$",
		message = "비밀번호는 영어와 숫자를 포함하여 8자 이상 16자 미만으로 입력해주세요.")
	String password,

	@Schema(description = "성별", example = "MALE", allowableValues = {"MALE", "FEMALE"})
	@NotNull(message = "성별을 선택해주세요.")
	Gender gender
) {
}
