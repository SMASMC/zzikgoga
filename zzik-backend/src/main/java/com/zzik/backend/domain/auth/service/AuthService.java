package com.zzik.backend.domain.auth.service;

import java.text.ParseException;
import java.time.Duration;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.dto.response.AuthCheckResponse;
import com.zzik.backend.domain.auth.dto.response.AuthResult;
import com.zzik.backend.domain.auth.dto.response.KakaoLoginResult;
import com.zzik.backend.domain.auth.dto.response.KakaoTokenResponse;
import com.zzik.backend.domain.auth.dto.response.SignupData;
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.enums.Gender;
import com.zzik.backend.domain.auth.enums.Provider;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.jwt.access.AccessTokenClaim;
import com.zzik.backend.global.security.jwt.access.AccessTokenProvider;
import com.zzik.backend.global.security.jwt.refresh.RefreshTokenClaim;
import com.zzik.backend.global.security.jwt.refresh.RefreshTokenProvider;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import shaded_package.com.nimbusds.jwt.SignedJWT;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

	private final MemberRepository memberRepository;
	private final AccessTokenProvider accessTokenProvider;
	private final RefreshTokenProvider refreshTokenProvider;
	private final RestTemplate restTemplate = new RestTemplate();
	private final StringRedisTemplate redis;

	@Value("${kakao.client-id}")
	private String kakaoClientId;

	@Value("${kakao.redirect-uri}")
	private String kakaoRedirectUri;

	private static final Duration REFRESH_TOKEN_VALIDITY_DURATION = Duration.ofDays(30);
	private static final Duration REFRESH_TOKEN_ROTATION_THRESHOLD = Duration.ofDays(7);

	private static final String RT_KEY_PREFIX = "RT:";
	private static final String AT_BLACKLIST_KEY_PREFIX = "BL_AT:";

	public KakaoLoginResult handleKakaoLoginFromIdToken(String idToken) throws ParseException {
		return processKakaoIdToken(idToken);
	}

	/**
	 * 카카오 ID 토큰 파싱 및 로그인/가입 처리 (공통 로직)
	 */
	private KakaoLoginResult processKakaoIdToken(String idToken) {
		try {
			var jwt = SignedJWT.parse(idToken);
			var claims = jwt.getJWTClaimsSet();

			String iss = claims.getIssuer();
			String aud = claims.getAudience().get(0);
			String sub = claims.getSubject();
			Date exp = claims.getExpirationTime();
			String nickName = claims.getStringClaim("nickname");
			String email = claims.getStringClaim("email");
			String picture = claims.getStringClaim("picture");

			// ❗️ 변경: RuntimeException -> BusinessException
			if (!"https://kauth.kakao.com".equals(iss)) {
				throw BusinessException.from(ExceptionCode.INVALID_KAKAO_ID_TOKEN);
			}
			if (!kakaoClientId.equals(aud)) {
				throw BusinessException.from(ExceptionCode.INVALID_KAKAO_ID_TOKEN);
			}
			if (exp.before(new Date())) {
				throw BusinessException.from(ExceptionCode.INVALID_KAKAO_ID_TOKEN);
			}

			var found = memberRepository.findByProviderAndProviderId(Provider.KAKAO, sub);
			if (found.isPresent()) {
				Member m = found.get();
				String accessToken = accessTokenProvider.generateToken(AccessTokenClaim.of(m.getId()));
				String refreshToken = refreshTokenProvider.generateToken(RefreshTokenClaim.of(m.getId()));

				String rtKey = RT_KEY_PREFIX + m.getId();
				redis.opsForValue().set(rtKey, refreshToken, REFRESH_TOKEN_VALIDITY_DURATION);

				// ❗️ 변경: Map -> AuthResult DTO
				AuthCheckResponse userDto = AuthCheckResponse.builder()
					.id(m.getId())
					.name(nickName) // 카카오 프로필 기준
					.email(email)
					.picture(picture)
					.build();

				return new AuthResult(accessToken, userDto);
			}

			String signupSessionToken = accessTokenProvider.issueTempToken(
				Map.of("provider", "KAKAO", "providerId", sub),
				Duration.ofMinutes(15)
			);

			// ❗️ 변경: Map -> SignupData DTO
			return new SignupData(signupSessionToken, nickName, email, picture);

		} catch (BusinessException e) {
			throw e; // BusinessException은 그대로 re-throw
		} catch (Exception e) {
			log.error("Invalid id_token processing error", e);
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.INVALID_KAKAO_ID_TOKEN);
		}
	}

	@Transactional
	public AuthResult signup(SignupRequest req) {
		Claims claims = accessTokenProvider.getClaimsFromToken(req.signupSessionToken());
		String provider = (String)claims.get("provider");
		String providerId = (String)claims.get("providerId");

		if (!"KAKAO".equals(provider)) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.INVALID_SIGNUP_TOKEN);
		}

		if (memberRepository.existsByProviderAndProviderId(Provider.valueOf(provider), providerId)) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.ALREADY_REGISTERED_USER);
		}

		Member newMember = Member.builder()
			.provider(Provider.valueOf(provider))
			.providerId(providerId)
			.gender(Gender.valueOf(req.gender()))
			.birthYear((short)req.birthYear())
			.bankCode(req.bankCode())
			.accountNum(req.accountNum())
			.name(req.name())
			.email(req.email())
			.thumbnailUrl(req.picture())
			.build();

		Member saved = memberRepository.save(newMember);

		String accessToken = accessTokenProvider.generateToken(
			AccessTokenClaim.of(saved.getId())
		);
		String refreshToken = refreshTokenProvider.generateToken(
			RefreshTokenClaim.of(saved.getId())
		);

		String rtKey = RT_KEY_PREFIX + saved.getId();
		redis.opsForValue().set(rtKey, refreshToken, REFRESH_TOKEN_VALIDITY_DURATION);

<<<<<<< Updated upstream
		return Map.of(
			"loggedIn", true,
			"accessToken", accessToken,
			// "refreshToken", refreshToken,
			"user", Map.of("id", saved.getId())
		);
=======
		// ❗️ 변경: Map -> AuthResult DTO
		AuthCheckResponse userDto = AuthCheckResponse.builder()
			.id(saved.getId())
			.name(saved.getName())
			.email(saved.getEmail())
			.picture(saved.getThumbnailUrl())
			.build();

		return new AuthResult(accessToken, userDto);
>>>>>>> Stashed changes
	}

	public String getIdTokenFromKakao(String code) {
		String url = "https://kauth.kakao.com/oauth/token";

		MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
		params.add("grant_type", "authorization_code");
		params.add("client_id", kakaoClientId);
		params.add("redirect_uri", kakaoRedirectUri);
		params.add("code", code);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

		HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

		try {
			ResponseEntity<KakaoTokenResponse> response =
				restTemplate.postForEntity(url, request, KakaoTokenResponse.class);

			KakaoTokenResponse body = response.getBody();
			if (body == null || body.getId_token() == null) {
				// ❗️ 변경: RuntimeException -> BusinessException
				throw BusinessException.from(ExceptionCode.KAKAO_AUTH_FAILED);
			}

			return body.getId_token();

		} catch (Exception e) {
			log.error("Failed to get id_token from Kakao", e);
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.KAKAO_AUTH_FAILED);
		}
	}

	/**
	 * 토큰 재발급 로직
	 * @param expiredAccessToken 만료된 AT (쿠키에서 추출)
	 * @return String 새로 발급된 AT
	 */
	public String reissueToken(String expiredAccessToken) {
		String blKey = AT_BLACKLIST_KEY_PREFIX + expiredAccessToken;
		if (redis.opsForValue().get(blKey) != null) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.ALREADY_LOGOUT_TOKEN);
		}

		Long memberId;
		try {
			memberId = accessTokenProvider.getMemberIdFromExpiredToken(expiredAccessToken);
		} catch (ExpiredJwtException e) {
			memberId = Long.valueOf(e.getClaims().getSubject());
		} catch (Exception e) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN);
		}

		if (memberId == null) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN);
		}

		String rtKey = RT_KEY_PREFIX + memberId;
		String storedRefreshToken = redis.opsForValue().get(rtKey);

		if (storedRefreshToken == null) {
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.SESSION_EXPIRED_OR_LOGOUT);
		}

		Claims rtClaims;
		try {
			rtClaims = refreshTokenProvider.getClaimsFromToken(storedRefreshToken);
		} catch (Exception e) {
			redis.delete(rtKey);
			// ❗️ 변경: RuntimeException -> BusinessException
			throw BusinessException.from(ExceptionCode.INVALID_REFRESH_TOKEN);
		}

		// (선택적) 5. DB에서 사용자 존재 확인 (탈퇴 대비)
		// memberRepository.findById(memberId)
		//   .orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_USER));

		// (권장) RT Rotation
		boolean rotate = shouldRotateRefresh(rtClaims, REFRESH_TOKEN_ROTATION_THRESHOLD);
		if (rotate) {
			String newRefreshToken = refreshTokenProvider.generateToken(RefreshTokenClaim.of(memberId));
			redis.opsForValue().set(rtKey, newRefreshToken, REFRESH_TOKEN_VALIDITY_DURATION);
		}

		// 새 AT 발급 및 반환
		return accessTokenProvider.generateToken(AccessTokenClaim.of(memberId));
	}


	/**
	 * 로그아웃 로직 (반환 타입 void로 변경)
	 * @param accessToken 유효한 AT (쿠키에서 추출)
	 */
	public void logout(String accessToken) {
		Claims claims;
		try {
			claims = accessTokenProvider.getClaimsFromToken(accessToken);
		} catch (Exception e) {
			// ❗️ 변경: 유효하지 않은 토큰으로 로그아웃 시도 시, 조용히 종료
			log.warn("Invalid token detected during logout attempt: {}", e.getMessage());
			return;
		}

		Long memberId = extractMemberId(claims);
		String rtKey = RT_KEY_PREFIX + memberId;

		redis.delete(rtKey);

		Date exp = claims.getExpiration();
		long ttlMs = Math.max(0, exp.getTime() - System.currentTimeMillis());

		if (ttlMs > 0) {
			String blKey = AT_BLACKLIST_KEY_PREFIX + accessToken;
			redis.opsForValue().set(blKey, "1", ttlMs, TimeUnit.MILLISECONDS);
		}

		// ❗️ 변경: Map 반환 제거
	}


	private boolean shouldRotateRefresh(Claims claims, Duration threshold) {
		Date exp = claims.getExpiration();
		if (exp == null) return false;
		long remainingMs = exp.getTime() - System.currentTimeMillis();
		return remainingMs <= threshold.toMillis();
	}

	private Long extractMemberId(Claims claims) {
		String sub = claims.getSubject();
		if (sub != null) {
			try {
				return Long.valueOf(sub);
			} catch (NumberFormatException ignore) {
			}
		}
		// ❗️ 변경: RuntimeException -> BusinessException
		throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN);
	}

	public AuthCheckResponse checkLoginStatus(Long memberId) {

		Member member = memberRepository.findById(memberId)
			// ❗️ 변경: RuntimeException -> BusinessException
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_USER));

		return AuthCheckResponse.builder()
			.id(member.getId())
			.name(member.getName())
			.email(member.getEmail())
			.picture(member.getThumbnailUrl())
			.build();
	}
}
