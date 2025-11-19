package com.zzik.backend.domain.media.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "사진 상세 정보 응답 DTO")
public record PhotoDetailResponse(
	@Schema(description = "사진 고유 ID", example = "10")
	Long id,

	@Schema(description = "업로더 멤버 ID", example = "1")
	Long memberId,

	@Schema(description = "업로더 이름", example = "신지")
	String uploaderName,

	@Schema(description = "S3 Presigned URL", example = "https://cdn.example.com...")
	String s3Url,

	@Schema(description = "업로드 시각", example = "2025-10-21T10:32:11Z")
	LocalDateTime uploadedAt
) {
}
