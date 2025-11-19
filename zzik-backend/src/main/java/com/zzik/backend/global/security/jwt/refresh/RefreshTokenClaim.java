package com.zzik.backend.global.security.jwt.refresh;

import java.util.Map;

import com.zzik.backend.global.security.jwt.JwtClaims;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class RefreshTokenClaim implements JwtClaims {
	private final Map<String, ?> claims;

	public static RefreshTokenClaim of(Long userId) {
		Map<String, Object> claims = Map.of(
			RefreshTokenClaimKeys.USER_ID.getValue(), userId.toString()
		);
		return new RefreshTokenClaim(claims);
	}

	@Override
	public Map<String, ?> getClaims() {
		return claims;
	}
}
