package com.zzik.backend.domain.management.controller;

/*
 * 견본용 코드 - 현재 주석처리됨
 * 실제 사용 시 주석 해제 필요
 */

/*
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zzik.backend.domain.management.api.MemberApi;
import com.zzik.backend.domain.management.dto.request.SignUpRequest;
import com.zzik.backend.domain.management.dto.response.SignUpResponse;
import com.zzik.backend.domain.management.service.MemberService;
import com.zzik.backend.global.presentation.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/auth")
public class MemberController implements MemberApi {
	private final MemberService memberService;

	@Override
	@PostMapping("/register")
	public ResponseEntity<ApiResponse<SignUpResponse>> registerBrideOrGroom(@RequestBody @Valid SignUpRequest request) {

		return ResponseEntity.ok(
			ApiResponse.createSuccess(memberService.registerBrideOrGroom(request))
		);
	}

}
*/