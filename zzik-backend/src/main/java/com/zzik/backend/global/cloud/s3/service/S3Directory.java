package com.zzik.backend.global.cloud.s3.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * S3 버킷 내 디렉토리 경로를 정의하는 열거형
 *
 * <p>파일 업로드 시 타입 안전성을 보장하기 위해 사용합니다.</p>
 */
@Getter
@RequiredArgsConstructor
public enum S3Directory {
	/**
	 * 영수증 이미지 저장 디렉토리
	 */
	RECEIPT("receipt"),

	/**
	 * 사진 저장 디렉토리
	 */
	PHOTO("photo");

	private final String path;
}