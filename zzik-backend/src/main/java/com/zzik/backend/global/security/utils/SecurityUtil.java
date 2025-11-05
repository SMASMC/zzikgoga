package com.zzik.backend.global.security.utils; // (패키지는 적절히 변경)

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

public class SecurityUtil {

	private SecurityUtil() {
	}

	/**
	 * SecurityContext에서 인증된 사용자의 memberId를 반환합니다.
	 * @return Long memberId
	 * @throws BusinessException (UNAUTHORIZED) 인증 정보가 없거나 유효하지 않을 때
	 */
	public static Long getCurrentMemberId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(
			authentication.getPrincipal())) {
			throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN); // (적절한 예외 코드로 변경)
		}

		Object principal = authentication.getPrincipal();

		if (principal instanceof Long) {
			return (Long)principal;
		}

		// 예상치 못한 Principal 타입
		throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN); // (적절한 예외 코드로 변경)
	}

	/**
	 * SecurityContext에서 인증된 사용자의 memberId를 반환합니다.
	 * 인증 정보가 없거나 비로그인 상태라면 null을 반환합니다.
	 *
	 * 로그인 상태인지에 따라 분기 처리해야 하는 경우(예: 초대 링크 검증) 사용합니다.
	 *
	 * @return Long memberId or null (비로그인 상태)
	 */
	public static Long getCurrentMemberIdOrNull() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		// 인증 객체 없거나 비인증
		if (authentication == null || !authentication.isAuthenticated()) {
			return null;
		}

		Object principal = authentication.getPrincipal();

		// 익명 사용자 처리
		if ("anonymousUser".equals(principal)) {
			return null;
		}

		// 정상 인증된 사용자
		if (principal instanceof Long) {
			return (Long)principal;
		}

		// 예상치 못한 principal 타입 -> 안전하게 null 반환
		return null;
	}
}
