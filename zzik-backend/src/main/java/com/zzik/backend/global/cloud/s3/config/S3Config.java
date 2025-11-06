package com.zzik.backend.global.cloud.s3.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS S3 클라이언트 설정 (SDK 2.x)
 */
@Configuration
public class S3Config {

	@Value("${cloud.aws.s3.credentials.access-key}")
	private String accessKey;

	@Value("${cloud.aws.s3.credentials.secret-key}")
	private String secretKey;

	@Value("${cloud.aws.s3.region.static}")
	private String region;

	/**
	 * S3Client 빈 생성 (AWS SDK 2.x)
	 *
	 * @return S3Client
	 */
	@Bean
	public S3Client s3Client() {
		AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
		return S3Client.builder()
			.credentialsProvider(StaticCredentialsProvider.create(credentials))
			.region(Region.of(region))
			.build();
	}

	/**
	 * S3Presigner 빈 생성 (presigned URL 생성용)
	 *
	 * @return S3Presigner
	 */
	@Bean
	public S3Presigner s3Presigner() {
		AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
		return S3Presigner.builder()
			.credentialsProvider(StaticCredentialsProvider.create(credentials))
			.region(Region.of(region))
			.build();
	}
}
