package com.zzik.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.zzik.backend.domain.cost.config.ClovaOcrProperties;

@SpringBootApplication
@EnableConfigurationProperties(ClovaOcrProperties.class)
public class ZzikBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ZzikBackendApplication.class, args);
	}

}
