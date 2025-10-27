package com.zzik.backend.global.security.jwt;

import java.util.Map;

public interface JwtClaims {
	Map<String, ?> getClaims();
}
