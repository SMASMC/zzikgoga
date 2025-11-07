package com.zzik.backend.domain.user.controller;

import com.zzik.backend.domain.user.api.UserApi;
import com.zzik.backend.domain.user.dto.response.TripMemberListResponse;
import com.zzik.backend.domain.user.service.UserService;
import com.zzik.backend.global.presentation.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController implements UserApi {

	private final UserService userService;

	@Override
	@GetMapping("/trip/{tripId}/members")
	public ResponseEntity<ApiResponse<TripMemberListResponse>> getTripMembers(@PathVariable Long tripId) {

		TripMemberListResponse responseDto = userService.getTripMembers(tripId);

		return ResponseEntity.ok(
			ApiResponse.createSuccess(responseDto)
		);
	}
}
