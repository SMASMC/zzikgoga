package com.zzik.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

	@Value("${nft.node.url}") String url;
	@Bean
	public WebClient uploaderWebClient() {
		return WebClient.builder()
			.baseUrl(url) // Node Irys Uploader 서버 주소
			.build();
	}
}
