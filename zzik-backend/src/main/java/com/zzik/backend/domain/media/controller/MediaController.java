package com.zzik.backend.domain.media.controller;

import com.zzik.backend.domain.media.api.MediaApi;
import com.zzik.backend.domain.media.dto.response.PhotoListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadListResponse;
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
	public ResponseEntity<ApiResponse<PhotoUploadListResponse>> uploadPhotos(
		@PathVariable Long tripId,
		@RequestPart("files") MultipartFile[] files
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();

		PhotoUploadListResponse responseDto = mediaService.uploadPhotos(tripId, files, memberId);

		return ResponseEntity.ok(
			ApiResponse.createSuccess(responseDto)
		);
	}

	@Override
	@GetMapping("/{tripId}")
	public ResponseEntity<ApiResponse<PhotoListResponse>> getPhotos(
		@PathVariable Long tripId,
		@RequestParam(required = false) Long cursor,
		@RequestParam(defaultValue = "20") int size
	) {
		Long memberId = SecurityUtil.getCurrentMemberId();

		PhotoListResponse responseDto = mediaService.getPhotos(tripId, memberId, cursor, size);

		return ResponseEntity.ok(ApiResponse.createSuccess(responseDto));
	}
}
