package com.zzik.backend.domain.auth.service;

import java.text.ParseException;
import java.time.Duration;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.zzik.backend.domain.auth.dto.request.SignupRequest;
import com.zzik.backend.domain.auth.dto.response.KakaoTokenResponse;
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.enums.Gender;
import com.zzik.backend.domain.auth.enums.Provider;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.global.security.jwt.access.AccessTokenClaim;
import com.zzik.backend.global.security.jwt.access.AccessTokenProvider;
import com.zzik.backend.global.security.jwt.refresh.RefreshTokenClaim;
import com.zzik.backend.global.security.jwt.refresh.RefreshTokenProvider;

import io.jsonwebtoken.Claims;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import shaded_package.com.nimbusds.jwt.SignedJWT;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final MemberRepository memberRepository; // 네가 이미 쓰는 JPA Repository
	private final AccessTokenProvider accessTokenProvider;
	private final RefreshTokenProvider refreshTokenProvider;

	private final RestTemplate restTemplate = new RestTemplate();

	@Value("${kakao.client-id}")
	private String kakaoClientId;

	@Value("${kakao.redirect-uri}")
	private String kakaoRedirectUri;

	public Map<String, Object> handleKakaoLogin(String code) throws ParseException {
		String idToken = getIdTokenFromKakao(code);

		// 🔹 1. id_token 파싱
		SignedJWT jwt;
		try {
			jwt = SignedJWT.parse(idToken);
		} catch (Exception e) {
			throw new RuntimeException("Invalid id_token");
		}

		var claims = jwt.getJWTClaimsSet();
		String iss = claims.getIssuer();
		String aud = claims.getAudience().get(0);
		String sub = claims.getSubject();
		Date exp = claims.getExpirationTime();
		String nickName = claims.getStringClaim("nickname");
		String email = claims.getStringClaim("email");
		String picture = claims.getStringClaim("picture");

		// 🔹 2. 최소 검증
		if (!"https://kauth.kakao.com".equals(iss)) {
			throw new RuntimeException("Invalid issuer");
		}
		if (!kakaoClientId.equals(aud)) {
			throw new RuntimeException("Invalid audience");
		}
		if (exp.before(new Date())) {
			throw new RuntimeException("Token expired");
		}

		// 🔹 3. DB 조회 (카카오 sub으로)
		Optional<Member> found = memberRepository.findByProviderAndProviderId(Provider.valueOf("KAKAO"), sub);

		if (found.isPresent()) {
			Member m = found.get();

			// ✅ 로그인 성공
			String accessToken = accessTokenProvider.generateToken(
				AccessTokenClaim.of(m.getId())
			);
			String refreshToken = refreshTokenProvider.generateToken(
				RefreshTokenClaim.of(m.getId())
			);

			return Map.of(
				"loggedIn", true,
				"accessToken", accessToken,
				"refreshToken", refreshToken,
				"user", Map.of("id", m.getId())
			);
		}

		// 🚧 미가입 → 회원가입 필요 (signupSessionToken 발급)
		String signupSessionToken = accessTokenProvider.issueTempToken(
			Map.of("provider", "KAKAO", "providerId", sub),
			Duration.ofMinutes(15)
		);

		return Map.of(
			"loggedIn", false,
			"signupRequired", true,
			"signupSessionToken", signupSessionToken,
			"name", nickName,
			"email", email,
			"picture", picture
		);
	}

	@Transactional
	public Map<String, Object> signup(SignupRequest req) {
		Claims claims = accessTokenProvider.getClaimsFromToken(req.signupSessionToken());
		String provider = (String)claims.get("provider");
		String providerId = (String)claims.get("providerId");

		if (!"KAKAO".equals(provider)) {
			throw new RuntimeException("Invalid signupSessionToken");
		}

		if (memberRepository.existsByProviderAndProviderId(Provider.valueOf(provider), providerId)) {
			throw new RuntimeException("Already registered");
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

		return Map.of(
			"loggedIn", true,
			"accessToken", accessToken,
			"refreshToken", refreshToken,
			"user", Map.of("id", saved.getId())
		);
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

		ResponseEntity<KakaoTokenResponse> response =
			restTemplate.postForEntity(url, request, KakaoTokenResponse.class);

		KakaoTokenResponse body = response.getBody();
		if (body == null || body.getId_token() == null) {
			throw new RuntimeException("Failed to get id_token from Kakao");
		}

		return body.getId_token();
	}

	public Map<String, Object> handleKakaoLoginFromIdToken(String idToken) {
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

			if (!"https://kauth.kakao.com".equals(iss)) throw new RuntimeException("Invalid issuer");
			if (!kakaoClientId.equals(aud)) throw new RuntimeException("Invalid audience");
			if (exp.before(new Date())) throw new RuntimeException("Token expired");

			var found = memberRepository.findByProviderAndProviderId(Provider.KAKAO, sub);
			if (found.isPresent()) {
				Member m = found.get();
				String accessToken = accessTokenProvider.generateToken(AccessTokenClaim.of(m.getId()));
				String refreshToken = refreshTokenProvider.generateToken(RefreshTokenClaim.of(m.getId()));

				return Map.of(
					"loggedIn", true,
					"accessToken", accessToken,
					"refreshToken", refreshToken,
					"user", Map.of("id", m.getId())
				);
			}

			String signupSessionToken = accessTokenProvider.issueTempToken(
				Map.of("provider", "KAKAO", "providerId", sub),
				Duration.ofMinutes(15)
			);

			return Map.of(
				"loggedIn", false,
				"signupRequired", true,
				"signupSessionToken", signupSessionToken,
				"name", nickName,
				"email", email,
				"picture", picture
			);
		} catch (Exception e) {
			throw new RuntimeException("Invalid id_token", e);
		}
	}
}
