package com.zzik.backend.global.event;

import java.time.LocalDateTime;

import lombok.extern.slf4j.Slf4j;

/**
 * 모든 이벤트의 기본 클래스
 *
 * <p>이벤트 시스템의 공통 구조를 제공하며, 모든 도메인 이벤트가 상속해야 하는 추상 클래스입니다.
 * 이벤트의 발행 시각, 발행 메소드, 처리 상태 등의 메타데이터를 관리합니다.</p>
 */
@Slf4j
public abstract class BaseEvent {

	/** 이벤트가 발행된 시각 */
	private final LocalDateTime eventPublishedAt;

	/** 이벤트를 발행한 스레드 번호 */
	private final String eventPublishedThreadNumber;

	/** 이벤트 리스너가 이벤트를 받아들인 시각 */
	private LocalDateTime eventReceivedAt;

	/** 이벤트 리스너의 처리 완료 여부 */
	private boolean eventProcessingCompleted;

	/**
	 * BaseEvent 기본 생성자
	 *
	 * <p>이벤트 발행 메소드 이름은 스택 트레이스를 분석하여 자동으로 설정됩니다.</p>
	 */
	public BaseEvent() {
		this.eventPublishedAt = LocalDateTime.now();
		this.eventPublishedThreadNumber = Thread.currentThread().getName();
		this.eventProcessingCompleted = false;
	}

	/**
	 * 이벤트 발행 시각을 반환합니다.
	 *
	 * @return 이벤트가 발행된 시각
	 */
	public LocalDateTime getEventPublishedAt() {
		return eventPublishedAt;
	}

	/**
	 * 이벤트를 발행한 스레드 번호를 반환합니다.
	 *
	 * @return 이벤트를 발행한 스레드 번호
	 */
	public String getEventPublishedThreadNumber() {
		return eventPublishedThreadNumber;
	}

	/**
	 * 이벤트 리스너가 이벤트를 받아들인 시각을 반환합니다.
	 *
	 * @return 이벤트를 받아들인 시각
	 */
	public LocalDateTime getEventReceivedAt() {
		return eventReceivedAt;
	}

	/**
	 * 이벤트 리스너가 이벤트를 받아들인 시각을 설정합니다.
	 *
	 * @param eventReceivedAt 이벤트를 받아들인 시각
	 */
	public void setEventReceivedAt(LocalDateTime eventReceivedAt) {
		this.eventReceivedAt = eventReceivedAt;
	}

	/**
	 * 이벤트 처리 완료 여부를 반환합니다.
	 *
	 * @return 이벤트 처리가 완료되었으면 true, 그렇지 않으면 false
	 */
	public boolean isEventProcessingCompleted() {
		return eventProcessingCompleted;
	}

	/**
	 * 이벤트 처리 완료 여부를 설정합니다.
	 *
	 * @param eventProcessingCompleted 이벤트 처리 완료 여부
	 */
	public void setEventProcessingCompleted(boolean eventProcessingCompleted) {
		this.eventProcessingCompleted = eventProcessingCompleted;
	}

	/**
	 * 이벤트의 상세 정보를 디버그 로그로 출력합니다.
	 */
	public void printDebug() {
		log.debug("=== {} 수신 ===", this.getClass().getSimpleName());
		printEventDetails();
		log.debug("Event Published At: {}", this.eventPublishedAt);
		log.debug("Event Published Thread: {}", this.eventPublishedThreadNumber);
		log.debug("Event Received At: {}", this.eventReceivedAt);
		log.debug("Event Processing Completed: {}", this.eventProcessingCompleted);
		log.debug("==============================");
	}

	/**
	 * 이벤트별 고유한 상세 정보를 출력합니다.
	 * 하위 클래스에서 오버라이드하여 구체적인 이벤트 정보를 출력할 수 있습니다.
	 */
	protected void printEventDetails() {
		// 기본 구현은 비어있음. 하위 클래스에서 필요에 따라 오버라이드
	}
}
