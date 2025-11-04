package com.zzik.backend.domain.auth.controller;

import java.text.ParseException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue; // ❗️ Import
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.dto.response.AuthCheckResponse;
import com.zzik.backend.domain.auth.service.AuthService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	private static final long ACCESS_TOKEN_COOKIE_VALIDITY_SECONDS = 1800;

	@GetMapping("/callback")
	public ResponseEntity<?> kakaoLogin(
		@RequestParam("code") String code,
		HttpServletResponse response
	) throws ParseException {

		Map<String, Object> result = authService.handleKakaoLogin(code);
		return handleAuthResponse(result, response);
	}

	@PostMapping("/kakao")
	public ResponseEntity<?> kakaoLogin(
		@RequestBody Map<String, String> body,
		HttpServletResponse response
	) throws ParseException {

		String idToken = body.get("idToken");
		Map<String, Object> result = authService.handleKakaoLoginFromIdToken(idToken);
		return handleAuthResponse(result, response);
	}

	@PostMapping("/signup")
	public ResponseEntity<?> signup(
		@RequestBody SignupRequest req,
		HttpServletResponse response
	) {

		Map<String, Object> result = authService.signup(req);
		return handleAuthResponse(result, response);
	}

	/**
	 *  로그인/회원가입 성공 시 공통 로직: AT는 쿠키로, RT는 응답에서 제거
	 */
	private ResponseEntity<?> handleAuthResponse(Map<String, Object> result, HttpServletResponse response) {
		if (result.get("accessToken") != null) {
			String accessToken = (String)result.get("accessToken");
			addAccessTokenCookie(response, accessToken); // AT 쿠키 설정

			return ResponseEntity.ok(Map.of(
				"loggedIn", true,
				"user", result.get("user")
			));
		}

		return ResponseEntity.ok(result);
	}

	@PostMapping("/reissue")
	public ResponseEntity<?> reissue(
		@CookieValue(name = "accessToken", required = false) String expiredAccessToken,
		HttpServletResponse response
	) {
		if (expiredAccessToken == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Access token cookie is missing"));
		}

		try {
			String newAccessToken = authService.reissueToken(expiredAccessToken);

			addAccessTokenCookie(response, newAccessToken);

			return ResponseEntity.ok(Map.of("message", "Token reissued"));

		} catch (RuntimeException e) {
			deleteAccessTokenCookie(response);
			return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<?> logout(
		@CookieValue(name = "accessToken", required = false) String accessToken,
		HttpServletResponse response
	) {
		if (accessToken != null) {
			authService.logout(accessToken);
		}

		deleteAccessTokenCookie(response);

		return ResponseEntity.ok(Map.of("loggedIn", false, "message", "Logged out"));
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

	/**
	 * AccessToken 쿠키 삭제
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
	public ResponseEntity<?> checkLoginStatus(
		@AuthenticationPrincipal Long memberId
	) {
		System.out.println(memberId);
		if (memberId == null) {
			return ResponseEntity.status(401).body(Map.of("loggedIn", false));
		}

		AuthCheckResponse userInfo = authService.checkLoginStatus(memberId);

		return ResponseEntity.ok(Map.of(
			"loggedIn", true,
			"user", userInfo
		));
	}
}
