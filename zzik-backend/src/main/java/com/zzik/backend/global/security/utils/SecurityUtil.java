package com.zzik.backend.global.security.utils; // (패키지는 적절히 변경)

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

public class SecurityUtil {

	private SecurityUtil() { }

	/**
	 * SecurityContext에서 인증된 사용자의 memberId를 반환합니다.
	 * @return Long memberId
	 * @throws BusinessException (UNAUTHORIZED) 인증 정보가 없거나 유효하지 않을 때
	 */
	public static Long getCurrentMemberId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

		if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
			throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN); // (적절한 예외 코드로 변경)
		}

		Object principal = authentication.getPrincipal();

		if (principal instanceof Long) {
			return (Long) principal;
		}

		// 예상치 못한 Principal 타입
		throw BusinessException.from(ExceptionCode.INVALID_ACCESS_TOKEN); // (적절한 예외 코드로 변경)
	}
}
