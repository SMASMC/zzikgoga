package com.zzik.backend.global.config.security;

import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.AbstractRequestMatcherRegistry;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.zzik.backend.global.security.filter.JwtAuthenticationFilter;
import com.zzik.backend.global.security.filter.JwtExceptionFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
	private static final String[] SWAGGER_ENDPOINTS = {
		"/api-docs/**", "/v3/api-docs/**", "/docs/open-api-3.0.1.yaml",
		"/swagger-ui/**", "/swagger", "/docs",
	};
	private static final String[] PUBLIC_ENDPOINTS = {"/", "/error"};
	private static final String[] ANONYMOUS_ENDPOINTS = {
		"/v1/auth/login",                    // 신랑/신부 로그인
		"/v1/auth/register",                 // 신랑/신부 회원가입
		"/v1/auth/guest/login",              // 하객 로그인
		"/v1/auth/guest/*/signup",           // 하객 회원가입
		"/v1/auth/spouse/verify",            // 배우자 코드 검증
		"/v1/auth/phone/check",              // 전화번호 중복검사
		"/v1/auth/status"                    // 토큰 검증
	};
	private static final String[] ATUATOR_ENDPOINTS = {"/actuator/**"};

	private final CorsConfigurationSource corsConfigurationSource;
	private final AccessDeniedHandler accessDeniedHandler;
	private final AuthenticationEntryPoint authenticationEntryPoint;

	private final DaoAuthenticationProvider daoAuthenticationProvider;
	private final JwtExceptionFilter jwtExceptionFilter;
	private final JwtAuthenticationFilter jwtAuthenticationFilter;

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		return defaultSecurity(http)
			.cors(cors -> cors.configurationSource(corsConfigurationSource))
			.authorizeHttpRequests(
				request -> defaultAuthorizeHttpRequests(request)
					.requestMatchers(SWAGGER_ENDPOINTS).permitAll()
					.requestMatchers(ATUATOR_ENDPOINTS).permitAll()
					.requestMatchers(ANONYMOUS_ENDPOINTS).permitAll() // ANONYMOUS 엔드포인트는 인증 없이 접근 가능
					.anyRequest().authenticated() // 나머지는 인증 필요 (메서드 레벨에서 세부 권한 검사)
			).build();
	}

	private HttpSecurity defaultSecurity(HttpSecurity http) throws Exception {
		return http.httpBasic(AbstractHttpConfigurer::disable)
			.csrf(AbstractHttpConfigurer::disable)
			.sessionManagement(sessionManagement ->
				sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)

			.authenticationProvider(daoAuthenticationProvider)
			.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
			.addFilterBefore(jwtExceptionFilter, JwtAuthenticationFilter.class)

			.exceptionHandling(exception -> exception
				.accessDeniedHandler(accessDeniedHandler)
				.authenticationEntryPoint(authenticationEntryPoint));
	}

	private AbstractRequestMatcherRegistry
		<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizedUrl> defaultAuthorizeHttpRequests(
		AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
		return auth.requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
			.requestMatchers(PUBLIC_ENDPOINTS).permitAll();
	}
}
