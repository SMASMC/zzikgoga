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

	/* 402xx - user */
	FORBIDDEN_TRIP(HttpStatus.FORBIDDEN, 40201, "해당 여행에 속해 있지 않습니다.", "user - 요청한 여행에 대해서 접근권한없음"),

	/* 403xx - cost */
	INVALID_TRIP(HttpStatus.NOT_FOUND, 40301, "존재하지 않는 여행입니다.", "cost - 존재하지 않는 여행"),
	NOT_TRIP_MEMBER(HttpStatus.FORBIDDEN, 40302, "여행 멤버가 아닙니다.", "cost - 권한 없음"),
	OCR_PROCESS_FAIL(HttpStatus.CONFLICT, 40303, "영수증 OCR 처리에 실패했습니다.", "cost - 인식 실패"),
	UNSUPPORTED_IMAGE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 40304, "지원하지 않는 이미지 형식입니다.", "cost - 이미지 형식 오류"),
	UPLOAD_SIZE_EXCEEDED(HttpStatus.PAYLOAD_TOO_LARGE, 40305, "이미지 용량이 제한을 초과했습니다. (최대 50MB)", "cost - 이미지 사이즈 초과"),

	/* 404xx - plan */
	INVALID_COMPANION(HttpStatus.NOT_FOUND, 40401, "존재하지 않는 동반자 ID입니다.", "plan - companion not found"),
	INVALID_THEMA(HttpStatus.NOT_FOUND, 40402, "존재하지 않는 테마 ID입니다.", "plan - thema not found"),
	INVALID_PLAN_TRIP(HttpStatus.NOT_FOUND, 40403, "존재하지 않는 여행입니다.", "plan - 여행 조회 실패"),
	TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, 40404, "조회할 여행이 존재하지 않습니다.", "plan - trip not found"),
	PLAN_INVALID_TITLE(HttpStatus.FORBIDDEN, 40405, "여행 제목은 필수입니다.", "plan - 제목 입력 필수"),
	PLAN_INVALID_DATE_RANGE(HttpStatus.FORBIDDEN, 40406, "유효하지 않은 날짜 형식입니다.", "plan - 유효하지 않은 날짜 형식"),

	/* 4042x - plan - location*/
	LOCATION_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, 40420, "장소 검색 API 호출에 실패했습니다.", "plan - 외부 지도 API 호출 실패"),

	/* 405xx - memory */

	/* 406xx - media */

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
