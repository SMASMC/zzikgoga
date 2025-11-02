package com.zzik.backend.global.security.jwt.access;

import static com.zzik.backend.global.security.jwt.access.AccessTokenClaimKeys.*;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.zzik.backend.global.security.jwt.JwtClaims;
import com.zzik.backend.global.security.jwt.JwtProvider;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class AccessTokenProvider implements JwtProvider {
	private final SecretKey secretKey;
	private final Duration tokenExpiration;

	public AccessTokenProvider(
		@Value("${jwt.secret-key.access-token}") String jwtSecretKey,
		@Value("${jwt.expiration-time.access-token}") Duration tokenExpiration
	) {
		final byte[] secretKeyBytes = jwtSecretKey.getBytes(StandardCharsets.UTF_8);
		this.secretKey = Keys.hmacShaKeyFor(secretKeyBytes);
		this.tokenExpiration = tokenExpiration;
	}

	@Override
	public String generateToken(JwtClaims claims) {
		Date now = new Date();
		String userId = String.valueOf(claims.getClaims().get(USER_ID.getValue()));

		return Jwts.builder()
			.header().add(createHeader())
			.and()
			.subject(userId)
			.claims(claims.getClaims())
			.signWith(secretKey)
			.expiration(createExpireDate(now, tokenExpiration.toMillis()))
			.compact();
	}

	@Override
	public JwtClaims getJwtClaimsFromToken(String token) {
		Claims claims = getClaimsFromToken(token);
		return AccessTokenClaim.of(Long.parseLong(claims.get(USER_ID.getValue(), String.class)));
	}

	@Override
	public LocalDateTime getExpiryDate(String token) {
		Claims claims = getClaimsFromToken(token);
		return toLocalDateTime(claims.getExpiration());
	}

	@Override
	public Claims getClaimsFromToken(String token) {
		return Jwts.parser()
			.verifyWith(secretKey)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}

	private Map<String, Object> createHeader() {
		return Map.of("typ", "JWT",
			"alg", "HS256",
			"regDate", System.currentTimeMillis());
	}

	private Date createExpireDate(final Date now, long expirationTime) {
		return new Date(now.getTime() + expirationTime);
	}

	private static LocalDateTime toLocalDateTime(Date date) {
		return Instant.ofEpochMilli(date.getTime()).atZone(ZoneId.systemDefault()).toLocalDateTime();
	}

	public String issueTempToken(Map<String, Object> extraClaims, Duration ttl) {
		Date now = new Date();
		Date exp = new Date(now.getTime() + ttl.toMillis());
		return Jwts.builder()
			.setClaims(extraClaims)
			.setIssuedAt(now)
			.setExpiration(exp)
			.signWith(secretKey, SignatureAlgorithm.HS256)
			.compact();
	}

}
