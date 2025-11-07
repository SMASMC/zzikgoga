// src/main/java/com/zzik/backend/domain/cost/dto/response/SettlementCalculateResponse.java
package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CostCalculateResponse {

	private CombinedSettlement combinedSettlement;

	@Getter
	@Setter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class CombinedSettlement {
		private long memberId;
		private String memberName;
		private int memberCount;
		private List<ToSend> toSend;
		private List<ToReceive> toReceive;
		private long netAmount; // (+)받을 총액 / (-)보낼 총액
	}

	@Getter
	@Setter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ToSend {
		private long targetMemberId;
		private String targetMemberName;
		private long amount;
	}

	@Getter
	@Setter
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ToReceive {
		private long fromMemberId;
		private String fromMemberName;
		private long amount;
	}
}
