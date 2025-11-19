package com.zzik.backend.domain.cost.config;

import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * 영수증 이미지 파일 업로드 설정
 * application.yml의 receipt.upload 섹션과 바인딩됩니다.
 */
@Configuration
@ConfigurationProperties(prefix = "receipt.upload")
@Validated
@Getter
@Setter
public class ReceiptFileUploadProperties {

	/**
	 * 업로드 가능한 최대 파일 크기 (바이트 단위)
	 * 1. application.yml에 설정이 있으면 → yml 값 사용 ✅ (권장)
	 *   * 2. application.yml에 설정이 없으면 → Properties 기본값 사용 (안전장치)
	 */
	@NotNull
	private Long maxFileSize = 50L * 1024 * 1024; // 50MB

	/**
	 * 업로드 허용 파일 확장자 목록
	 * 1. application.yml에 설정이 있으면 → yml 값 사용 ✅ (권장)
	 * 2. application.yml에 설정이 없으면 → Properties 기본값 사용 (안전장치)
	 */
	@NotEmpty
	private Set<String> allowedExtensions = Set.of("jpg", "jpeg", "png", "pdf", "tif", "tiff");
}
