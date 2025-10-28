package com.zzik.backend.global.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 40000번대 예외 코드를 관리하는 열거형 클래스입니다.
 *
 * <p>이 클래스는 40000번대의 애플리케이션 특정 오류 코드만 관리합니다.
 * 다른 범위의 예외 코드(30000번대, 50000번대)는 {@link com.zzik.backend.global.handler.GlobalExceptionHandler}
 * 와 {@link com.zzik.backend.global.presentation.ApiResponse}에서 예외 상황에 맞게 일괄적으로 관리됩니다.</p>
 *
 * <ul>
 * <li>{@link HttpStatus} httpStatus - HTTP 상태 코드</li>
 * <li>int errorCode - 애플리케이션 특정 오류 코드 (40000번대)</li>
 * <li>String message - 사용자 친화적인 오류 메시지</li>
 * <li>String description - 추가 오류 정보</li>
 * </ul>
 */
@Getter
@RequiredArgsConstructor
public enum ExceptionCode {

	/* 401xx - auth */
	EXISTS_PHONE_NUMBER(HttpStatus.CONFLICT, 40101, "이미 존재하는 전화번호", "auth - 회원가입 시 중복된 전화번호"),
	INVALID_SPOUSE_CODE(HttpStatus.NOT_FOUND, 40102, "유효하지 않은 배우자 코드", "auth - 존재하지 않는 배우자 코드"),
	ALREADY_CONNECTED_SPOUSE_CODE(HttpStatus.CONFLICT, 40103, "이미 연결된 배우자 코드", "auth - 다른 사용자와 이미 연결된 배우자 코드"),
	NOT_FOUND_USER(HttpStatus.NOT_FOUND, 40104, "존재하지 않는 사용자", "auth - 로그인 시 사용자를 찾을 수 없음"),
	PASSWORD_MISMATCH(HttpStatus.UNAUTHORIZED, 40105, "비밀번호 불일치", "auth - 로그인 시 비밀번호가 틀림"),
	NOT_FOUND_GUEST_INFO(HttpStatus.NOT_FOUND, 40106, "하객 정보를 찾을 수 없음", "auth - 하객 로그인 시 해당 정보 없음"),
	NOT_FOUND_WEDDING(HttpStatus.NOT_FOUND, 40107, "존재하지 않는 결혼식", "auth - 유효하지 않은 weddingId"),
	INVALID_SPOUSE_CODE_VERIFICATION(HttpStatus.NOT_FOUND, 40108, "유효하지 않은 배우자 코드", "auth - 배우자 코드 검증 실패"),
	ALREADY_USED_SPOUSE_CODE(HttpStatus.CONFLICT, 40109, "이미 연결된 배우자 코드", "auth - 배우자 코드 이미 사용중"),
	INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, 40110, "유효하지 않은 Refresh Token", "auth - 토큰 갱신 시 잘못된 토큰"),
	EXPIRED_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, 40111, "만료된 Refresh Token", "auth - 토큰 갱신 시 만료된 토큰"),
	ALREADY_LOGOUT_TOKEN(HttpStatus.NOT_FOUND, 40112, "이미 로그아웃된 토큰", "auth - 로그아웃 시 이미 무효화된 토큰"),

	/* 403xx - cost */
	RECEIPT_RECOGNIZE_FAIL(HttpStatus.CONFLICT, 40301, "영수증 OCR 분석 실패", "cost - 영수증 인식 실패"),
	INVALID_UPLOAD_SIZE(HttpStatus.NOT_FOUND, 40302, "사진 업로드 실패", "cost - 사진 업로드 실패"),

	/* 421xx - management - wedding */
	WEDDING_ALREADY_REGISTERED(HttpStatus.CONFLICT, 42101, "이미 등록된 결혼식 정보", "management - 결혼식 정보 중복 등록"),
	SPOUSE_NOT_CONNECTED(HttpStatus.NOT_FOUND, 42102, "배우자가 연결되어 있지 않음", "management - 결혼식 등록 시 배우자 연결 필요"),
	WEDDING_NOT_FOUND(HttpStatus.NOT_FOUND, 42103, "존재하지 않는 결혼식", "management - 결혼식 조회 실패"),
	NO_WEDDING_EDIT_PERMISSION(HttpStatus.FORBIDDEN, 42104, "결혼식 수정 권한 없음", "management - 신랑신부만 결혼식 정보 수정 가능"),

	/* 422xx - management - invitation */
	INVITATION_ALREADY_EXISTS(HttpStatus.CONFLICT, 42201, "이미 청첩장이 존재함", "management - 청첩장 중복 생성"),
	WEDDING_INFO_REQUIRED(HttpStatus.NOT_FOUND, 42202, "결혼식 정보가 없음", "management - 청첩장 생성 시 결혼식 정보 필요"),
	CUSTOM_URL_ALREADY_IN_USE(HttpStatus.CONFLICT, 42203, "이미 사용중인 커스텀 URL", "management - 커스텀 URL 중복"),
	INVITATION_NOT_FOUND(HttpStatus.NOT_FOUND, 42204, "청첩장을 찾을 수 없음", "management - 청첩장 조회 실패"),
	INVALID_CUSTOM_URL(HttpStatus.NOT_FOUND, 42205, "유효하지 않은 커스텀 URL", "management - 커스텀 URL로 청첩장 조회 실패"),
	NO_INVITATION_EDIT_PERMISSION(HttpStatus.FORBIDDEN, 42206, "청첩장 수정 권한 없음", "management - 신랑신부만 청첩장 수정 가능"),

	/* 423xx - management - guest */
	GUEST_ALREADY_REGISTERED(HttpStatus.CONFLICT, 42301, "이미 등록된 하객", "management - 동일 이름, 전화번호의 하객 중복 등록"),
	GUEST_NOT_FOUND(HttpStatus.NOT_FOUND, 42302, "하객 정보를 찾을 수 없음", "management - 존재하지 않는 하객"),
	NO_GUEST_EDIT_PERMISSION(HttpStatus.FORBIDDEN, 42303, "하객 수정 권한 없음", "management - 하객 정보는 신랑신부만 수정 가능"),
	NO_ATTENDANCE_EDIT_PERMISSION(HttpStatus.FORBIDDEN, 42304, "참석 여부 수정 권한 없음", "management - 하객 자신만 참석 여부 수정 가능"),
	NO_MESSAGE_SEND_PERMISSION(HttpStatus.FORBIDDEN, 42305, "메시지 전송 권한 없음", "management - 신랑신부만 감사 메시지 전송 가능"),

	/* 431xx - sns */
	IMAGE_UPLOAD_LIMIT_EXCEEDED(HttpStatus.CONFLICT, 43101, "벌수 업로드 제한 초과", "sns - 이미지 개수 제한 (1개 이상 10개 이하)"),
	INVALID_POST(HttpStatus.NOT_FOUND, 43102, "유효하지 않은 게시글", "sns - 존재하지 않는 게시글"),
	NO_POST_EDIT_PERMISSION(HttpStatus.FORBIDDEN, 43103, "게시글 수정 권한 없음", "sns - 작성자만 게시글 수정/삭제 가능"),
	ALREADY_LIKED(HttpStatus.CONFLICT, 43104, "이미 좋아요를 누름", "sns - 중복 좋아요"),
	LIKE_NOT_FOUND(HttpStatus.NOT_FOUND, 43105, "좋아요를 누르지 않음", "sns - 좋아요 취소 시 좋아요 없음"),
	INVALID_IMAGE(HttpStatus.NOT_FOUND, 43106, "유효하지 않은 이미지", "sns - 존재하지 않는 이미지 ID"),
	ALREADY_TAGGED_PERSON(HttpStatus.CONFLICT, 43107, "이미 태그된 사람", "sns - 동일 이미지에 같은 사람 중복 태그"),
	TAG_USER_NOT_FOUND(HttpStatus.NOT_FOUND, 43108, "존재하지 않는 사용자", "sns - 태그하려는 사용자를 찾을 수 없음"),
	NO_PHOTOS_TO_DOWNLOAD(HttpStatus.NOT_FOUND, 43109, "다운로드할 사진이 없음", "sns - 일괄 다운로드할 사진이 없음"),

	/* 441xx - wedstream */
	STREAMING_ALREADY_IN_PROGRESS(HttpStatus.CONFLICT, 44101, "이미 스트리밍이 진행 중", "wedstream - 스트리밍 중복 시작"),
	NO_STREAMING_START_PERMISSION(HttpStatus.FORBIDDEN, 44102, "스트리밍 시작 권한 없음", "wedstream - 신랑신부만 스트리밍 시작 가능"),
	NO_STREAMING_IN_PROGRESS(HttpStatus.NOT_FOUND, 44103, "진행 중인 스트리밍이 없음", "wedstream - 스트리밍 종료/참여 시 스트리밍 없음"),
	ETIQUETTE_NOT_AGREED(HttpStatus.CONFLICT, 44104, "에티켓에 동의하지 않음", "wedstream - 스트리밍 참여 에티켓 동의 필요"),
	NOT_PARTICIPATING_IN_STREAMING(HttpStatus.NOT_FOUND, 44105, "스트리밍에 참여하지 않음",
		"wedstream - 스트리밍에 참여하지 않은 상태에서 액션 수행"),
	CHAT_DISABLED(HttpStatus.FORBIDDEN, 44106, "채팅이 비활성화됨", "wedstream - 스트리밍 채팅이 비활성화된 상태"),
	NO_RECORDED_VIDEO(HttpStatus.NOT_FOUND, 44107, "녹화된 영상이 없음", "wedstream - 녹화된 스트리밍 영상이 없음"),

	/* 451xx - notification */
	NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, 45101, "알림을 찾을 수 없음", "notification - 존재하지 않는 알림"),
	NO_NOTIFICATION_ACCESS_PERMISSION(HttpStatus.FORBIDDEN, 45102, "알림 접근 권한 없음", "notification - 다른 사용자의 알림 접근"),

	/* JWT/보안 관련 에러코드 */
	FORBIDDEN_ACCESS_TOKEN(HttpStatus.FORBIDDEN, 49801, "토큰 접근 권한 없음"),
	EMPTY_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, 49802, "토큰 포함되지 않음"),
	EXPIRED_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, 49803, "재 로그인 필요",
		"해당 애러 발생시, RefreshToken을 통해 AccessToken을 재발급 해주세요. 해당 오류는 권한이 필요한 모든 엔드포인트에서 발생할 수 있습니다."),
	MALFORMED_TOKEN(HttpStatus.UNAUTHORIZED, 49804, "비정상적 토큰", "보안 위험이므로 완전히 로그아웃 처리해주세요."),
	TAMPERED_TOKEN(HttpStatus.UNAUTHORIZED, 49805, "서명이 조작된 토큰.", "보안 위험이므로 완전히 로그아웃 처리해주세요."),
	UNSUPPORTED_JWT_TOKEN(HttpStatus.UNAUTHORIZED, 49806, "지원하지 않는 토큰", "보안 위험이므로 완전히 로그아웃 처리해주세요."),

	/* 499xx ETC */
	NOT_FOUND_RESOURCE(HttpStatus.NOT_FOUND, 49901, "해당 경로를 찾을 수 없습니다."),
	METHOD_FORBIDDEN(HttpStatus.METHOD_NOT_ALLOWED, 49902, "지원하지 않는 HTTP 메서드를 사용합니다."),
	INVALID_IMAGE_EXTENSION(HttpStatus.BAD_REQUEST, 49903, "지원되지 않는 이미지 파일 확장자입니다.",
		"이미지 파일 업로드에 허용되지 않는 파일 형식입니다."),
	SMS_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, 49904, "외부 SMS 통신중 에러가 났습니다.");

	private final HttpStatus httpStatus;
	private final int errorCode;
	private final String message;
	private final String description;

	ExceptionCode(HttpStatus httpStatus, int errorCode, String message) {
		this(httpStatus, errorCode, message, "");
	}
}
