package com.zzik.backend.domain.plan.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateTripRequest {

	private String title;

	@JsonProperty("start_date")
	private LocalDate startDate;  // "2025-01-06"

	@JsonProperty("end_date")
	private LocalDate endDate;    // "2025-01-06"

	@JsonProperty("male_count")
	private Short maleCount;

	@JsonProperty("female_count")
	private Short femaleCount;

	@JsonProperty("companion_id")
	private List<Long> companionId;

	@JsonProperty("thema_id")
	private List<Long> themaId;
}
