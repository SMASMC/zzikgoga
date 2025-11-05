package com.zzik.backend.global.security.jwt.invite;

import static com.zzik.backend.global.security.jwt.invite.InviteTokenClaimKeys.*;

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
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class InviteTokenProvider implements JwtProvider {

	private final SecretKey secretKey;
	private final Duration defaultTtl;

	public InviteTokenProvider(
		@Value("${jwt.secret-key.invite-token}") String jwtSecretKey,
		@Value("${jwt.expiration-time.invite-token:PT24H}") Duration defaultTtl
	) {
		final byte[] secretKeyBytes = jwtSecretKey.getBytes(StandardCharsets.UTF_8);
		this.secretKey = Keys.hmacShaKeyFor(secretKeyBytes);
		this.defaultTtl = defaultTtl;
	}

	// 기본 TTL로 발급
	@Override
	public String generateToken(JwtClaims claims) {
		Date now = new Date();
		return Jwts.builder()
			.header().add(createHeader())
			.and()
			.subject("invite")
			.claims(claims.getClaims())
			.signWith(secretKey)
			.expiration(createExpireDate(now, defaultTtl.toMillis()))
			.issuedAt(now)
			.compact();
	}

	// 만료를 호출 측에서 직접 정하고 싶을 때(여행 종료일 + 1일 상한 적용 후 사용)
	public String issueInviteToken(Map<String, Object> extraClaims, Duration ttl) {
		Date now = new Date();
		return Jwts.builder()
			.header().add(createHeader())
			.and()
			.subject("invite")
			.claims(extraClaims)
			.signWith(secretKey)
			.expiration(createExpireDate(now, ttl.toMillis()))
			.issuedAt(now)
			.compact();
	}

	@Override
	public Claims getClaimsFromToken(String token) {
		return Jwts.parser()
			.verifyWith(secretKey)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}

	@Override
	public JwtClaims getJwtClaimsFromToken(String token) {
		Claims c = getClaimsFromToken(token);
		Long tripId = c.get(TRIP_ID.getValue(), Number.class).longValue();
		String jti = c.get(JTI.getValue(), String.class);
		return InviteTokenClaim.of(tripId, jti);
	}

	@Override
	public LocalDateTime getExpiryDate(String token) {
		Claims c = getClaimsFromToken(token);
		return toLocalDateTime(c.getExpiration());
	}

	public Long getTripId(String token) {
		Claims c = getClaimsFromToken(token);
		return c.get(TRIP_ID.getValue(), Number.class).longValue();
	}

	public String getJtiEvenIfExpired(String token) {
		try {
			Claims c = getClaimsFromToken(token);
			return c.get(JTI.getValue(), String.class);
		} catch (ExpiredJwtException e) {
			return e.getClaims().get(JTI.getValue(), String.class);
		}
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
}
