package com.zzik.backend.global.security.jwt.invite;

import lombok.Getter;

@Getter
public enum InviteTokenClaimKeys {
	TRIP_ID("tripId"),
	PURPOSE("purpose"),   // "invite"
	JTI("jti");

	private final String value;

	InviteTokenClaimKeys(String value) {
		this.value = value;
	}
}
