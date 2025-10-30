package com.zzik.backend.domain.auth.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class KakaoTokenResponse {
	private String token_type;
	private String access_token;
	private String refresh_token;
	private String id_token;
	private Integer expires_in;
	private Integer refresh_token_expires_in;
	private String scope;
}

