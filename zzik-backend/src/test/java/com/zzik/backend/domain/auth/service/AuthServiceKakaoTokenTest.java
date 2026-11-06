package com.zzik.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.wallet.service.WalletService;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.jwt.access.AccessTokenProvider;
import com.zzik.backend.global.security.jwt.refresh.RefreshTokenProvider;

class AuthServiceKakaoTokenTest {
	@Test
	void rejectsForgedIdTokenBeforeLookingUpMember() {
		var members = mock(MemberRepository.class);
		var service = new AuthService(
			members,
			mock(AccessTokenProvider.class),
			mock(RefreshTokenProvider.class),
			mock(StringRedisTemplate.class),
			mock(WalletService.class)
		);
		ReflectionTestUtils.setField(service, "kakaoClientId", "test-client-id");

		String header = encode("{\"alg\":\"HS256\"}");
		String payload = encode("{\"iss\":\"https://kauth.kakao.com\",\"aud\":\"test-client-id\","
			+ "\"sub\":\"existing-user\",\"exp\":" + Instant.now().plusSeconds(300).getEpochSecond() + "}");
		String forgedToken = header + "." + payload + "." + encode("fake-signature");

		assertThatThrownBy(() -> service.handleKakaoLoginFromIdToken(forgedToken))
			.isInstanceOfSatisfying(BusinessException.class,
				ex -> assertThat(ex.isExceptionCode(ExceptionCode.INVALID_KAKAO_ID_TOKEN)).isTrue());
		verifyNoInteractions(members);
	}

	private static String encode(String value) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
	}
}
