package com.zzik.backend.domain.auth.controller;

import java.text.ParseException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.auth.dto.request.KakaoLoginRequest;
import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.dto.response.AuthCheckResponse;
import com.zzik.backend.domain.auth.dto.response.AuthResult;
import com.zzik.backend.domain.auth.dto.response.AuthSuccessResponse;
import com.zzik.backend.domain.auth.dto.response.KakaoLoginResult;
import com.zzik.backend.domain.auth.dto.response.LoginResponse;
import com.zzik.backend.domain.auth.dto.response.LogoutResponse;
import com.zzik.backend.domain.auth.dto.response.MessageResponse;
import com.zzik.backend.domain.auth.dto.response.SignupData;
import com.zzik.backend.domain.auth.dto.response.SignupRequiredResponse;
import com.zzik.backend.domain.auth.service.AuthService;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	private static final long ACCESS_TOKEN_COOKIE_VALIDITY_SECONDS = 18000;

	@PostMapping("/kakao")
	public ResponseEntity<ApiResponse<LoginResponse>> kakaoLogin(
		@RequestBody KakaoLoginRequest kakaoLoginRequest,
		HttpServletResponse response
	) throws ParseException {

		String idToken = kakaoLoginRequest.idToken();

		KakaoLoginResult result = authService.handleKakaoLoginFromIdToken(idToken);

		if (result instanceof AuthResult authResult) {
			addAccessTokenCookie(response, authResult.accessToken());
			var responseDto = new AuthSuccessResponse(true, authResult.user());
			return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));

		} else if (result instanceof SignupData signupData) {
			var responseDto = new SignupRequiredResponse(
				false,
				true,
				signupData.signupSessionToken(),
				signupData.name(),
				signupData.email(),
				signupData.picture()
			);
			return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
		}

		throw new IllegalStateException("Unexpected KakaoLoginResult type");
	}

	@PostMapping("/signup")
	public ResponseEntity<ApiResponse<AuthSuccessResponse>> signup(
		@RequestBody SignupRequest req,
		HttpServletResponse response
	) {

		AuthResult authResult = authService.signup(req);

		addAccessTokenCookie(response, authResult.accessToken());
		var responseDto = new AuthSuccessResponse(true, authResult.user());

		return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
	}

	@PostMapping("/reissue")
	public ResponseEntity<ApiResponse<MessageResponse>> reissue(
		@CookieValue(name = "accessToken", required = false) String expiredAccessToken,
		HttpServletResponse response
	) {
		if (expiredAccessToken == null) {
			throw BusinessException.from(ExceptionCode.EMPTY_ACCESS_TOKEN);
		}

		String newAccessToken = authService.reissueToken(expiredAccessToken);

		addAccessTokenCookie(response, newAccessToken);

		return ResponseEntity.ok(ApiResponse.createSuccess(new MessageResponse("Token reissued")));
	}

	@PostMapping("/logout")
	public ResponseEntity<ApiResponse<LogoutResponse>> logout(
		@CookieValue(name = "accessToken", required = false) String accessToken,
		HttpServletResponse response
	) {
		if (accessToken != null) {
			authService.logout(accessToken);
		}

		deleteAccessTokenCookie(response);

		var responseDto = new LogoutResponse(false, "Logged out");
		return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
	}

	/**
	 * AccessToken을 HttpOnly 쿠키에 추가 (변경 없음)
	 */
	private void addAccessTokenCookie(HttpServletResponse response, String token) {
		Cookie cookie = new Cookie("accessToken", token);
		cookie.setPath("/");
		cookie.setHttpOnly(true);
		cookie.setSecure(true);
		cookie.setMaxAge((int)ACCESS_TOKEN_COOKIE_VALIDITY_SECONDS);
		response.addCookie(cookie);
	}

	/**
	 * AccessToken 쿠키 삭제 (변경 없음)
	 */
	private void deleteAccessTokenCookie(HttpServletResponse response) {
		Cookie cookie = new Cookie("accessToken", null);
		cookie.setPath("/");
		cookie.setHttpOnly(true);
		cookie.setSecure(true);
		cookie.setMaxAge(0);
		response.addCookie(cookie);
	}

	@GetMapping("/check")
	public ResponseEntity<ApiResponse<AuthSuccessResponse>> checkLoginStatus(
		@AuthenticationPrincipal Long memberId
	) {
		if (memberId == null) {
			throw BusinessException.from(ExceptionCode.EMPTY_ACCESS_TOKEN);
		}

		AuthCheckResponse userInfo = authService.checkLoginStatus(memberId);

		var responseDto = new AuthSuccessResponse(true, userInfo);
		return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
	}
}
