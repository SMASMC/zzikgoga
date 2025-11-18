package com.zzik.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

	@Bean
	public WebClient uploaderWebClient() {
		return WebClient.builder()
			.baseUrl("http://localhost:4000") // Node Irys Uploader 서버 주소
			.build();
	}
}
