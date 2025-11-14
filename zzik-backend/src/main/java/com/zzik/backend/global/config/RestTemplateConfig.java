package com.zzik.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate 설정
 */
@Configuration
public class RestTemplateConfig {

	/**
	 * RestTemplate Bean 생성
	 * <p>
	 * 외부 API 호출에 사용됩니다.
	 * </p>
	 */
	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}
}