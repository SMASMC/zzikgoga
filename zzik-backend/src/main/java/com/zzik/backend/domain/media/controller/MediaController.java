package com.zzik.backend.domain.media.controller;

import com.zzik.backend.domain.media.api.MediaApi;
import com.zzik.backend.domain.media.dto.response.PhotoUploadResponse;
import com.zzik.backend.domain.media.service.MediaService;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/media")
public class MediaController implements MediaApi {

	private final MediaService mediaService;

	@Override
	@PostMapping(value = "/{tripId}", consumes = "multipart/form-data")
	public ResponseEntity<ApiResponse<PhotoUploadResponse>> uploadPhoto(
		@PathVariable Long tripId,
		@RequestPart("file") MultipartFile file
	) {

		Long memberId = SecurityUtil.getCurrentMemberId();

		PhotoUploadResponse responseDto = mediaService.uploadPhoto(tripId, file, memberId);

		return ResponseEntity.ok(
			ApiResponse.createSuccess(responseDto)
		);
	}
}
