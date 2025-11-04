package com.zzik.backend.domain.auth.dto.response;


import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthCheckResponse {
	private Long id;
	private String name;
	private String email;
	private String picture;
}
