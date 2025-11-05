package com.zzik.backend.domain.plan.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteAcceptResponse {

	private boolean joined;

	@JsonProperty("trip_id")
	private Long tripId;
}
