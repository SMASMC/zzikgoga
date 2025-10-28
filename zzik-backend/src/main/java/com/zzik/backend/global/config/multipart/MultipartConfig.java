package com.zzik.backend.global.config.multipart;

import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

import jakarta.servlet.MultipartConfigElement;

@Configuration
public class MultipartConfig {
	@Bean
	public MultipartConfigElement multipartConfigElement() {
		MultipartConfigFactory f = new MultipartConfigFactory();
		f.setMaxFileSize(DataSize.ofMegabytes(20));
		f.setMaxRequestSize(DataSize.ofMegabytes(20));
		return f.createMultipartConfig();
	}
}
