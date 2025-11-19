package com.zzik.backend.domain.media.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Getter
@Schema(description = "사진 업로드 응답 DTO")
public class PhotoUploadResponse {

	@Schema(description = "생성된 사진의 고유 ID", example = "1")
	private final Long photoId;

	@Schema(description = "업로드된 S3 URL", example = "https://s3...")
	private final String s3Url;

	public PhotoUploadResponse(Long photoId, String s3Url) {
		this.photoId = photoId;
		this.s3Url = s3Url;
	}
}
