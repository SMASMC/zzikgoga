package com.zzik.backend.global.config.encrypt;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;

@Configuration
public class CryptoConfig {

	@Value("${app.security.encrypt.password}")
	private String password;

	@Value("${app.security.encrypt.salt}")
	private String salt;

	/**
	 * 개인키 등 민감정보 양방향 암호화를 위한 TextEncryptor
	 * AES-256 GCM 사용
	 */
	@Bean
	public TextEncryptor textEncryptor() {
		return Encryptors.text(password, salt);
	}
}
