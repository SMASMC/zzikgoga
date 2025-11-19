package com.zzik.backend.global.config;

import java.util.concurrent.Executor;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.zzik.backend.global.handler.CustomAsyncExceptionHandler;

/**
 * AsyncConfig 클래스는 Spring의 비동기 처리(@Async) 설정을 담당합니다.
 *
 * <p>비동기 메서드 실행을 위한 스레드 풀 설정과 예외 처리 핸들러를 구성합니다.
 * AsyncConfigurer 인터페이스를 구현하여 커스터마이징된 비동기 실행 환경을 제공합니다.</p>
 */
@Configuration // Spring IoC 컨테이너에게 이 클래스가 설정 클래스임을 알림
@EnableAsync // @Async 어노테이션을 사용한 비동기 처리 기능 활성화
public class AsyncConfig implements AsyncConfigurer {

	/**
	 * 비동기 메서드를 실행할 스레드 풀(Executor)을 생성하고 반환합니다.
	 *
	 * <p>이 메서드는 @Async 어노테이션이 붙은 메서드가 실행될 때 사용할 스레드 풀을 정의합니다.
	 * 반환된 Executor는 Spring이 자동으로 관리하며, 비동기 작업 실행 시 사용됩니다.</p>
	 *
	 * @return 설정된 ThreadPoolTaskExecutor 인스턴스
	 */
	@Override
	public Executor getAsyncExecutor() {
		// ThreadPoolTaskExecutor: Spring에서 제공하는 스레드 풀 구현체 생성
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

		// 기본적으로 생성하여 대기 상태로 유지할 스레드 개수 설정
		// 애플리케이션 시작 시 5개의 스레드가 미리 생성되어 대기
		// 부하가 적을 때도 이 개수만큼은 유지됨
		executor.setCorePoolSize(5);

		// 최대로 생성할 수 있는 스레드 개수 설정
		// 큐가 가득 차면 CorePoolSize를 초과하여 최대 10개까지 스레드 생성 가능
		// 부하가 많을 때 동적으로 스레드가 증가
		executor.setMaxPoolSize(10);

		// 작업 큐의 용량 설정 (대기열에 쌓을 수 있는 작업 개수)
		// CorePoolSize의 모든 스레드가 작업 중일 때 새 작업은 큐에 대기
		// 큐에 100개까지 작업이 쌓일 수 있으며, 초과 시 MaxPoolSize까지 스레드 추가 생성
		executor.setQueueCapacity(100);

		// 생성되는 스레드의 이름 접두사 설정
		// 예: "async-1", "async-2" 형태로 스레드 이름 생성
		// 로그나 디버깅 시 어떤 스레드에서 실행되었는지 쉽게 파악 가능
		executor.setThreadNamePrefix("async-");

		// 설정이 완료된 Executor를 초기화
		// 이 시점에 CorePoolSize만큼의 스레드가 생성되고 준비 상태가 됨
		executor.initialize();

		// 설정이 완료된 Executor 반환
		// Spring이 이 Executor를 관리하며 @Async 메서드 실행 시 사용
		return executor;
	}

	/**
	 * 비동기 메서드에서 발생한 예외를 처리할 핸들러를 반환합니다.
	 *
	 * <p>@Async 메서드에서 처리되지 않은 예외가 발생하면 이 핸들러가 호출됩니다.
	 * void 반환 타입의 @Async 메서드에서 발생한 예외는 호출자에게 전파되지 않으므로
	 * 이 핸들러를 통해 로깅, 알림 등의 처리를 수행해야 합니다.</p>
	 *
	 * @return CustomAsyncExceptionHandler 인스턴스
	 */
	@Override
	public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
		// CustomAsyncExceptionHandler 인스턴스 생성 및 반환
		// 이 핸들러가 모든 @Async 메서드에서 발생하는 예외를 캐치
		return new CustomAsyncExceptionHandler();
	}
}