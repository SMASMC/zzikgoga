package com.zzik.backend.global.config.security;

import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
	public static final String[] PUBLIC_API_PATHS = {
		// --- Swagger ---
		"/api-docs/**", "/v3/api-docs/**", "/docs/open-api-3.0.1.yaml",
		"/swagger-ui/**", "/swagger", "/docs",
		// --- 기본 경로 ---
		"/", "/error",
		// --- Actuator ---
		"/actuator/**",
		// --- Health Check ---
		"/health-check",
		// --- 공개 API (인증 불필요) ---
		"/auth/kakao",
		"/auth/callback",
		"/auth/signup",
		"/auth/reissue",
		// --- 테스트 API (로컬 환경 전용) ---
		"/auth/test/**"
	};

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
					.requestMatchers(PUBLIC_API_PATHS).permitAll()
					.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
					.requestMatchers("/auth/check", "/auth/logout").authenticated()
					.anyRequest().authenticated()
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
			.requestMatchers("/", "/error").permitAll();
	}
}
