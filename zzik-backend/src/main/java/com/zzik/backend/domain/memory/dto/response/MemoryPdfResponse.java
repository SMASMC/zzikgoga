package com.zzik.backend.domain.memory.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "여행 기록 PDF 변환 응답 DTO")
public record MemoryPdfResponse(
	@Schema(description = "기록 ID", example = "1")
	Long memoryId,

	@Schema(description = "생성된 PDF의 S3 URL", example = "https://s3...")
	String pdfUrl,

	@Schema(description = "저장소 타입", example = "S3")
	String storageType
) {
}
