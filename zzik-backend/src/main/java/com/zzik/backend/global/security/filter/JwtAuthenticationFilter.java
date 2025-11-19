package com.zzik.backend.global.security.filter;

import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Stream;

import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.zzik.backend.global.config.security.SecurityConfig;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.authentication.CustomUserDetails;
import com.zzik.backend.global.security.jwt.JwtClaims;
import com.zzik.backend.global.security.jwt.JwtProvider;
import com.zzik.backend.global.security.jwt.access.AccessTokenClaimKeys;
import com.zzik.backend.infra.redis.forbidden.ForbiddenTokenService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
	private final UserDetailsService userDetailService;
	private final JwtProvider accessTokenProvider;
	private final ForbiddenTokenService forbiddenTokenService;

	private static final String[] PUBLIC_ENDPOINTS = {"/", "/error"};
	private static final String[] SWAGGER_ENDPOINTS = {
		"/api-docs/**", "/v3/api-docs/**", "/docs/open-api-3.0.1.yaml",
		"/swagger-ui/**", "/swagger", "/docs",
	};
	private static final String[] ANONYMOUS_ENDPOINTS = {
		"/cost/*/receipt",
		"/cost/*",
		"/auth/*",
		"/plan/*",
	};
	private static final String[] AUTH_PATHS = { "/auth/**" };
	private static final String[] COST_PATHS = { "/cost/**" };
	private static final String[] PLAN_PATHS = { "/plan/**" };

	private final RequestMatcher publicPathMatcher;

	public JwtAuthenticationFilter(UserDetailsService userDetailService, JwtProvider accessTokenProvider, ForbiddenTokenService forbiddenTokenService) {
		this.userDetailService = userDetailService;
		this.accessTokenProvider = accessTokenProvider;
		this.forbiddenTokenService = forbiddenTokenService;

		this.publicPathMatcher = new OrRequestMatcher(
			Arrays.stream(SecurityConfig.PUBLIC_API_PATHS)
				.map(AntPathRequestMatcher::new)
				.toArray(RequestMatcher[]::new)
		);
	}

	/**
	 * [핵심] 이 메서드가 true를 반환하면 doFilterInternal이 실행되지 않습니다.
	 */
	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
		if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
			return true;
		}

		return publicPathMatcher.matches(request);
	}


	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
		@NonNull FilterChain filterChain) throws
		ServletException, IOException {

		String accessToken = resolveAccessToken(request);

		UserDetails userDetails = getUserDetails(accessToken);
		authenticateUser(userDetails, request);
		filterChain.doFilter(request, response);
	}

	private String resolveAccessToken(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();

		if (cookies != null) {
			for (Cookie cookie : cookies) {
				if ("accessToken".equals(cookie.getName())) {
					String token = cookie.getValue();

					if (!StringUtils.hasText(token)) {
						throw BusinessException.from(ExceptionCode.EMPTY_ACCESS_TOKEN);
					}
					if (forbiddenTokenService.isForbidden(token)) {
						throw BusinessException.from(ExceptionCode.FORBIDDEN_ACCESS_TOKEN);
					}
					return token;
				}
			}
		}
		// 쿠키 배열이 없거나, "accessToken" 쿠키를 못 찾음
		throw BusinessException.from(ExceptionCode.EMPTY_ACCESS_TOKEN);
	}

	private UserDetails getUserDetails(String accessToken) {
		JwtClaims claims = accessTokenProvider.getJwtClaimsFromToken(accessToken);
		String userId = (String)claims.getClaims().get(AccessTokenClaimKeys.USER_ID.getValue());

		return userDetailService.loadUserByUsername(userId);
	}

	private void authenticateUser(UserDetails userDetails, HttpServletRequest request) {

		CustomUserDetails customUserDetails = (CustomUserDetails) userDetails;

		Long memberId = customUserDetails.getUserId();

		UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
			memberId, null, customUserDetails.getAuthorities()
		);

		authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
