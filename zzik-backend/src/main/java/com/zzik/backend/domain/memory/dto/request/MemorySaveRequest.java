package com.zzik.backend.domain.memory.dto.request;

import java.util.Map;

import com.zzik.backend.domain.memory.enums.MemoryStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "여행 기록 저장(생성/수정) 요청 DTO")
public record MemorySaveRequest(
	@Schema(description = "기록 제목", example = "우리의 첫 제주도 여행")
	@NotBlank
	String title,

	@Schema(description = "기록 내용 (Notion-style JSON 문자열)", example = "{\"blocks\":[...]}", type = "string")
	@NotNull
	Map<String, Object> content,

	@Schema(description = "기록 상태 (작성 중: onprocess, 작성 완료: completed)", example = "onprocess")
	@NotNull
	MemoryStatus status
) {
}
