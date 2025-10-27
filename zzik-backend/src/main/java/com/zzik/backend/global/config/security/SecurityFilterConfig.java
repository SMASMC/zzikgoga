package com.zzik.backend.global.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zzik.backend.global.security.filter.JwtAuthenticationFilter;
import com.zzik.backend.global.security.filter.JwtExceptionFilter;
import com.zzik.backend.global.security.jwt.JwtProvider;
import com.zzik.backend.infra.redis.forbidden.ForbiddenTokenService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;

@Configuration
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public class SecurityFilterConfig {
	private final ObjectMapper objectMapper;

	private final UserDetailsService userDetailServiceImpl;
	private final JwtProvider accessTokenProvider;
	private final ForbiddenTokenService forbiddenTokenService;

	@Bean
	public JwtExceptionFilter jwtExceptionFilter() {
		return new JwtExceptionFilter(objectMapper);
	}

	@Bean
	public JwtAuthenticationFilter jwtAuthenticationFilter() {
		return new JwtAuthenticationFilter(userDetailServiceImpl, accessTokenProvider, forbiddenTokenService);
	}
}

