package com.zzik.backend.domain.auth.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.auth.dto.request.TestLoginRequest;
import com.zzik.backend.domain.auth.dto.response.TestLoginResponse;
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.jwt.access.AccessTokenClaim;
import com.zzik.backend.global.security.jwt.access.AccessTokenProvider;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 로컬 환경 전용 테스트 로그인 컨트롤러
 * - 운영 환경에서는 비활성화됨 (@Profile("local"))
 * - 이메일만으로 간편하게 JWT 토큰을 발급받을 수 있음
 */
@Slf4j
@RestController
@RequestMapping("/auth/test")
@RequiredArgsConstructor
@Profile("local")
@Tag(name = "Test Auth (Local Only)", description = "로컬 환경 전용 테스트 인증 API")
public class TestAuthController {

	private final MemberRepository memberRepository;
	private final AccessTokenProvider accessTokenProvider;

	private static final long ACCESS_TOKEN_COOKIE_VALIDITY_SECONDS = 18000;

	@PostMapping("/login")
	@Operation(
		summary = "테스트 로그인 (로컬 환경 전용)",
		description = "이메일만으로 JWT Access Token을 발급받고 쿠키에 자동으로 설정됩니다. " +
			"로그인 후 바로 인증이 필요한 API를 호출할 수 있습니다."
	)
	public ResponseEntity<ApiResponse<TestLoginResponse>> testLogin(
		@RequestBody TestLoginRequest request,
		HttpServletResponse response
	) {
		log.info("[테스트 로그인] 요청 이메일: {}", request.email());

		// 이메일로 회원 조회
		Member member = memberRepository.findByEmail(request.email())
			.orElseThrow(() -> {
				log.error("[테스트 로그인] 회원을 찾을 수 없음: {}", request.email());
				return BusinessException.from(ExceptionCode.NOT_FOUND_USER);
			});

		// Access Token 생성
		String accessToken = accessTokenProvider.generateToken(
			AccessTokenClaim.of(member.getId())
		);

		// 쿠키에 Access Token 설정 (기존 AuthController와 동일한 방식)
		addAccessTokenCookie(response, accessToken);

		log.info("[테스트 로그인] 성공 - 회원 ID: {}, 이름: {}", member.getId(), member.getName());

		TestLoginResponse responseDto = TestLoginResponse.builder()
			.accessToken(accessToken)
			.memberId(member.getId())
			.email(member.getEmail())
			.name(member.getName())
			.build();

		return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
	}

	/**
	 * AccessToken을 HttpOnly 쿠키에 추가
	 */
	private void addAccessTokenCookie(HttpServletResponse response, String token) {
		Cookie cookie = new Cookie("accessToken", token);
		cookie.setPath("/");
		cookie.setHttpOnly(true);
		cookie.setSecure(true);
		cookie.setMaxAge((int)ACCESS_TOKEN_COOKIE_VALIDITY_SECONDS);
		response.addCookie(cookie);
	}
}
