package com.zzik.backend.global.handler;

import java.lang.reflect.Method;
import java.util.Arrays;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;

import com.zzik.backend.global.exception.BusinessException;

import lombok.extern.slf4j.Slf4j;

/**
 * CustomAsyncExceptionHandler 클래스는 비동기(@Async) 메서드에서 발생하는 예외를 전역적으로 처리합니다.
 *
 * <p>Spring의 AsyncUncaughtExceptionHandler 인터페이스를 구현하여
 * @Async 어노테이션이 붙은 메서드에서 발생한 예외를 캐치하고 로깅합니다.
 * GlobalExceptionHandler는 HTTP 요청 컨텍스트에서만 동작하므로 비동기 환경에서는 이 핸들러가 필요합니다.</p>
 */
@Slf4j
public class CustomAsyncExceptionHandler implements AsyncUncaughtExceptionHandler {

	/**
	 * 비동기 메서드에서 처리되지 않은 예외를 처리합니다.
	 *
	 * @param ex 발생한 예외 객체 (모든 종류의 Throwable)
	 * @param method 예외가 발생한 메서드의 리플렉션 객체 (메서드 이름, 시그니처 등 정보 포함)
	 * @param params 메서드 호출 시 전달된 파라미터 배열 (디버깅 및 로깅용)
	 */
	@Override
	public void handleUncaughtException(Throwable ex, Method method, Object... params) {
		// 비동기 메서드에서 예외가 발생했음을 로그에 기록 (ERROR 레벨)
		// method.getName(): 예외가 발생한 메서드 이름 추출
		// Arrays.toString(params): 메서드에 전달된 파라미터들을 문자열로 변환하여 출력
		// ex: 스택 트레이스를 포함한 예외 정보를 함께 로깅
		log.error("비동기 메서드 예외 발생 - Method: {}, Params: {}",
			method.getName(), Arrays.toString(params), ex);

		// 발생한 예외가 우리 프로젝트의 비즈니스 예외(BusinessException)인지 확인
		if (ex instanceof BusinessException businessEx) {
			// 비즈니스 예외일 경우 더 상세한 정보를 로그에 기록
			// getErrorCode(): 사전에 정의된 에러 코드 (예: 4001, 5002 등)
			// getMessage(): 에러 메시지 (예: "권한이 없습니다", "리소스를 찾을 수 없습니다" 등)
			log.error("비즈니스 에러 - Code: {}, Message: {}",
				businessEx.getErrorCode(), businessEx.getMessage());

			// TODO: 필요시 추가 처리 구현
			// - 알림 발송 (예: Slack, 이메일 등)
			// - 에러 DB 저장 (모니터링용)
			// - 재시도 큐에 추가 (재처리 필요 시)
			// - 메트릭 수집 (에러율 모니터링)
		}

		// 예외 종류와 관계없이 공통으로 수행할 작업이 있다면 여기에 추가
		// 예: 모니터링 시스템에 알림, 통계 수집 등
	}
}