package com.zzik.backend.domain.cost.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "clova-ocr")
public record ClovaOcrProperties(
	String invokeUrl,
	String secretKey
) {
}
