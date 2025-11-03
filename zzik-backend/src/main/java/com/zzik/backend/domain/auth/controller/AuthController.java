package com.zzik.backend.domain.auth.controller;

import java.text.ParseException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@GetMapping("/callback")
	public ResponseEntity<?> kakaoLogin(@RequestParam("code") String code) throws ParseException {
		return ResponseEntity.ok(authService.handleKakaoLogin(code));
	}

	@PostMapping("/kakao")
	public ResponseEntity<?> kakaoLogin(@RequestBody Map<String, String> body) throws ParseException {
		String idToken = body.get("idToken");
		return ResponseEntity.ok(authService.handleKakaoLoginFromIdToken(idToken));
	}

	@PostMapping("/signup")
	public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
		return ResponseEntity.ok(authService.signup(req));
	}
}

