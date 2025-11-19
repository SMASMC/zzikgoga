package com.zzik.backend.domain.media.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "사진 다중 업로드 응답 DTO")
public record PhotoUploadListResponse(
	@Schema(description = "업로드에 성공한 사진 목록")
	List<PhotoUploadResponse> uploadedPhotos
) {
}
