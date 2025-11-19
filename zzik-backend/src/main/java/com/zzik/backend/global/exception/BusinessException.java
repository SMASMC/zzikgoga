package com.zzik.backend.global.exception;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class BusinessException extends RuntimeException {
	private final HttpStatus httpStatus;
	private final int errorCode;
	private final String message;

	public static BusinessException from(ExceptionCode ex) {
		return new BusinessException(ex.getHttpStatus(), ex.getErrorCode(), ex.getMessage());
	}

	public boolean isExceptionCode(ExceptionCode ex) {
		return this.httpStatus == ex.getHttpStatus()
			&& this.errorCode == ex.getErrorCode()
			&& this.message.equals(ex.getMessage());
	}
}
