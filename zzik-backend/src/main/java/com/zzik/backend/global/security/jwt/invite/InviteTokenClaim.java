package com.zzik.backend.global.security.jwt.invite;

import static com.zzik.backend.global.security.jwt.invite.InviteTokenClaimKeys.*;

import java.util.Map;

import com.zzik.backend.global.security.jwt.JwtClaims;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class InviteTokenClaim implements JwtClaims {
	private final Map<String, ?> claims;

	public static InviteTokenClaim of(Long tripId, String jti) {
		Map<String, Object> m = Map.of(
			TRIP_ID.getValue(), tripId,
			PURPOSE.getValue(), "invite",
			JTI.getValue(), jti
		);
		return new InviteTokenClaim(m);
	}

	@Override
	public Map<String, ?> getClaims() {
		return claims;
	}
}
