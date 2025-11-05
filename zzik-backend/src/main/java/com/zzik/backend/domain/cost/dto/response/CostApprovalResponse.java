package com.zzik.backend.domain.cost.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "비용 승인 응답 DTO", example = """
	{
	  "memberId": 3,
	  "memberName": "홍길동",
	  "isAccepted": true,
	  "acceptedAt": "2025-01-20T15:30:00"
	}
	""")
public class CostApprovalResponse {  // 레코드 대신 클래스 형태로 변경 제안 (Swagger 호환성 위해)

	@Schema(description = "회원 ID", example = "3", required = true)
	private Long memberId;

	@Schema(description = "회원 이름", example = "홍길동", required = true)
	private String memberName;

	@Schema(description = "승인 여부", example = "true", required = true)
	private Boolean isAccepted;

	@Schema(description = "승인 시간", example = "2025-01-20T15:30:00", required = true)
	private String acceptedAt;  // String으로 유지 (JSON 예시 맞춤), 필요 시 LocalDateTime으로 변경 가능
}
