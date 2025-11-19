package com.zzik.backend.domain.auth.dto.request;

public record SignupRequest(
	String gender,
	int birthYear,
	String bankCode,
	String accountNum,
	String signupSessionToken,
	String picture,
	String name,
	String email
) {
}
