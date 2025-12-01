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
	INVALID_KAKAO_ID_TOKEN(HttpStatus.UNAUTHORIZED, 40113, "카카오 ID 토큰이 유효하지 않습니다."),
	KAKAO_AUTH_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 40114, "카카오 인증 서버 통신에 실패했습니다."),
	INVALID_SIGNUP_TOKEN(HttpStatus.UNAUTHORIZED, 40115, "회원가입 세션 토큰이 유효하지 않습니다."),
	ALREADY_REGISTERED_USER(HttpStatus.CONFLICT, 40116, "이미 가입된 사용자입니다."),
	INVALID_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, 40117, "유효하지 않은 액세스 토큰입니다."), // 기존 JWT 예외 외 일반 AT 예외
	SESSION_EXPIRED_OR_LOGOUT(HttpStatus.UNAUTHORIZED, 40118, "세션이 만료되었거나 로그아웃된 상태입니다. 다시 로그인해주세요."),

	/* 402xx - user */
	FORBIDDEN_TRIP(HttpStatus.FORBIDDEN, 40201, "해당 여행에 속해 있지 않습니다.", "user - 요청한 여행에 대해서 접근권한없음"),

	/* 403xx - cost */
	INVALID_TRIP(HttpStatus.NOT_FOUND, 40301, "존재하지 않는 여행입니다.", "cost - 존재하지 않는 여행"),
	NOT_TRIP_MEMBER(HttpStatus.FORBIDDEN, 40302, "해당 여행 멤버가 아닙니다.", "trip과 member에 매칭되는 tripmember가 없음"),
	OCR_PROCESS_FAIL(HttpStatus.CONFLICT, 40303, "영수증 OCR 처리에 실패했습니다.", "cost - 인식 실패"),
	UNSUPPORTED_IMAGE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 40304, "지원하지 않는 이미지 형식입니다.", "cost - 이미지 형식 오류"),
	UPLOAD_SIZE_EXCEEDED(HttpStatus.PAYLOAD_TOO_LARGE, 40305, "이미지 용량이 제한을 초과했습니다. (최대 50MB)", "cost - 이미지 사이즈 초과"),
	ZERO_TOTAL_AMOUNT(HttpStatus.CONFLICT, 40306, "영수증 총액이 0원으로 인식되었습니다. 사진을 다시 찍어주세요.", "cost - 총액 0원 인식"),
	RECEIPT_CONTEXT_INVALID(HttpStatus.CONFLICT, 40307, "영수증 필수 입력 사항이 입력되지 않았습니다.", "cost - 입력 사항 미기재"),
	INVALID_COST(HttpStatus.NOT_FOUND, 40308, "존재하지 않는 결제 항목입니다.", "cost - 비용 항목 not found"),
	NO_COSTS(HttpStatus.CONFLICT, 40309, "정산할 결제 내역이 없습니다.", "cost - 비용 없음"),
	SHARE_MISSING(HttpStatus.CONFLICT, 40310, "일부 결제 항목에 분담자 설정이 누락되었습니다.", "cost - 분담자 누락/유효하지 않음"),
	EDIT_LOCK_NOT_FOUND(HttpStatus.CONFLICT, 40311, "사용자가 락을 가지고 있지 않습니다.", "cost - edit lock 없음"),
	TRIP_COST_ALREADY_COMPLETED(HttpStatus.CONFLICT, 40312, "해당 여행의 정산이 완료되어 수정할 수 없습니다.",
		"cost - trip.isCostCompleted = true"),
	COST_MENU_NOT_FOUND(HttpStatus.NOT_FOUND, 40313, "존재하지 않는 결제 메뉴 항목입니다.", "cost - cost_menu not found"),
	COST_NOT_FOUND(HttpStatus.NOT_FOUND, 40314, "존재하지 않는 결제 항목입니다.", "cost - cost not found"),
	COST_PAYER_IDS_EMPTY(HttpStatus.BAD_REQUEST, 40315, "메뉴 분담자가 지정되지 않았습니다.", "cost - payerIds 빈 리스트"),
	/* 4032x - cost - accept */
	ALREADY_ACCEPTED_COST(HttpStatus.CONFLICT, 40320, "이미 정산에 수락 하셨습니다.", "cost - approval 이미 정산을 수락함"),
	BANK_ACCOUNT_REQUIRED(HttpStatus.BAD_REQUEST, 40321, "정산을 위해 계좌 정보가 필요합니다. 마이페이지에서 계좌 정보를 등록해주세요.", "cost - 계좌 정보 미등록"),

	/* 404xx - plan */
	INVALID_COMPANION(HttpStatus.NOT_FOUND, 40401, "존재하지 않는 동반자 ID입니다.", "plan - companion not found"),
	INVALID_THEMA(HttpStatus.NOT_FOUND, 40402, "존재하지 않는 테마 ID입니다.", "plan - thema not found"),
	INVALID_PLAN_TRIP(HttpStatus.NOT_FOUND, 40403, "존재하지 않는 여행입니다.", "plan - 여행 조회 실패"),
	TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, 40404, "조회할 여행이 존재하지 않습니다.", "plan - trip not found"),
	PLAN_INVALID_TITLE(HttpStatus.FORBIDDEN, 40405, "여행 제목은 필수입니다.", "plan - 제목 입력 필수"),
	PLAN_INVALID_DATE_RANGE(HttpStatus.FORBIDDEN, 40406, "유효하지 않은 날짜 형식입니다.", "plan - 유효하지 않은 날짜 형식"),
	INVITE_INVALID(HttpStatus.UNAUTHORIZED, 40451, "유효하지 않은 초대 링크입니다."),
	INVITE_EXPIRED(HttpStatus.UNAUTHORIZED, 40452, "초대 링크가 만료되었습니다."),

	/* 405xx - memory */
	NOT_FOUND_DATA(HttpStatus.NOT_FOUND, 40501, "여행 또는 회원을 찾을 수 없습니다."),
	FORBIDDEN(HttpStatus.NOT_FOUND, 40502, "해당 여행에 속한 멤버가 아닙니다."),
	FILE_TOO_LARGE(HttpStatus.FORBIDDEN, 40506, "PAYLOAD_TOO_LARGE", "파일 크기가 50MB를 초과합니다."),
	INVALID_FILE_EXTENSION(HttpStatus.BAD_REQUEST, 40507, "BAD_REQUEST", "허용되지 않는 파일 확장자입니다."),
	FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 40508, "INTERNAL_SERVER_ERROR", "파일 업로드에 실패했습니다."),
	INVALID_FILE(HttpStatus.BAD_REQUEST, 40509, "BAD_REQUEST", "파일이 유효하지 않습니다."),
	NOT_FOUND_MEMORY(HttpStatus.NOT_FOUND, 40510, "저장된 기록이 없습니다."),


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
	INVALID_IMAGE_EXTENSION(HttpStatus.BAD_REQUEST, 49903, "지원되지 않는 이미지 파일 확장자입니다.", "이미지 파일 업로드에 허용되지 않는 파일 형식입니다."),

	/* 4992x 외부 서비스 */
	S3_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 49920, "이미지 서버 내부 오류로 인해 현재 파일을 업로드할 수 없습니다.",
		"S3 SDK에서 익셉션 발생"),
	S3_DELETE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 49921, "파일 삭제에 실패했습니다.", "S3 삭제 중 오류 발생"),
	S3_URL_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 49922, "파일 URL 생성에 실패했습니다.", "Presigned URL 생성 중 오류 발생"),

	/* NFT */
	WALLET_CREATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 50101, "지갑 생성에 실패했습니다.", "지갑 생성에 실패"),
	WALLET_DECRYPTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, 50102, "지갑 해석에 실패했습니다.", "지갑 해석에 실패"),
	ARWEAVE_LIMIT_EXCEEDED(HttpStatus.BANDWIDTH_LIMIT_EXCEEDED, 50103, "사용량이 부족합니다");

	private final HttpStatus httpStatus;
	private final int errorCode;
	private final String message;
	private final String description;

	ExceptionCode(HttpStatus httpStatus, int errorCode, String message) {
		this(httpStatus, errorCode, message, "");
	}
}
