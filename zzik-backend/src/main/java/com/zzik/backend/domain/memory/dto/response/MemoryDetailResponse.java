package com.zzik.backend.domain.memory.dto.response;

import com.zzik.backend.domain.memory.entity.Memory;
import com.zzik.backend.domain.memory.enums.MemoryStatus;
import com.zzik.backend.domain.memory.enums.MintStatus;
import com.zzik.backend.domain.memory.enums.StorageType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Map;

@Schema(description = "여행 기록 상세 조회 응답 DTO")
public record MemoryDetailResponse(
	@Schema(description = "기록 ID", example = "1")
	Long memoryId,

	@Schema(description = "여행 ID", example = "123")
	Long tripId,

	@Schema(description = "작성자 ID", example = "1")
	Long memberId,

	@Schema(description = "작성자 이름", example = "홍길동")
	String uploaderName,

	@Schema(description = "제목", example = "우리의 첫 제주도 여행")
	String title,

	@Schema(description = "상태", example = "onprocess")
	MemoryStatus status,

	@Schema(description = "기록 내용 (JSONB 문자열)", example = "{\"blocks\":[...]}", type = "string")
	Map<String, Object> content,

	@Schema(description = "PDF URL", example = "https://s3...")
	String pdfUrl,

	@Schema(description = "Arweave URL", example = "https://arweave.net/...")
	String arweaveUrl,

	@Schema(description = "NFT ID", example = "101")
	String nftId,

	@Schema(description = "NFT 민팅 상태", example = "NONE")
	MintStatus mintStatus,

	@Schema(description = "NFT 민팅 해시", example = "0x...")
	String mintHash,

	@Schema(description = "저장소 타입", example = "S3")
	StorageType storageType,

	@Schema(description = "생성 시각", example = "2025-11-10T10:30:00")
	LocalDateTime createdAt,

	@Schema(description = "수정 시각", example = "2025-11-10T10:30:00")
	LocalDateTime updatedAt
) {
	public static MemoryDetailResponse from(Memory memory) {
		return new MemoryDetailResponse(
			memory.getId(),
			memory.getTrip().getId(),
			memory.getMember().getId(),
			memory.getMember().getName(),
			memory.getTitle(),
			memory.getStatus(),
			memory.getContent(),
			memory.getPdfUrl(),
			memory.getArweaveUrl(),
			memory.getNftId(),
			memory.getMintStatus(),
			memory.getMintHash(),
			memory.getStorageType(),
			memory.getCreatedAt(),
			memory.getUpdatedAt()
		);
	}
}
