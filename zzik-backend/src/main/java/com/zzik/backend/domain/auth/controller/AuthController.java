package com.zzik.backend.domain.auth.controller;

import java.text.ParseException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.auth.dto.request.LogoutRequest;
import com.zzik.backend.domain.auth.dto.request.ReissueRequest;
import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.service.AuthService;

import jakarta.validation.Valid;
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

	@PostMapping("/signup")
	public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
		return ResponseEntity.ok(authService.signup(req));
	}

	@PostMapping("/reissue")
	public ResponseEntity<?> reissue(@Valid @RequestBody ReissueRequest req) {
		return ResponseEntity.ok(authService.reissueToken(req.refreshToken()));
	}

	@PostMapping("/logout")
	public ResponseEntity<?> logout(@Valid @RequestBody LogoutRequest req) {
		return ResponseEntity.ok(authService.logout(req.refreshToken()));
	}
}

