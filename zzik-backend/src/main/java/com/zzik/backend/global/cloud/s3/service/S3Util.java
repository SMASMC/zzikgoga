package com.zzik.backend.global.cloud.s3.service;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

/**
 * S3 저수준 유틸리티 클래스 (package-private, AWS SDK 2.x)
 *
 * <p>이 클래스는 같은 패키지 내의 {@link S3Service}에서만 사용됩니다.
 * 다른 도메인 서비스(PhotoService, CostService 등)에서는
 * {@link S3Service}를 통해서만 S3 기능에 접근해야 합니다.</p>
 *
 * @see S3Service
 */
@Component
public class S3Util {

	private final S3Client s3Client;
	private final S3Presigner s3Presigner;

	@Value("${cloud.aws.s3.bucket}")
	private String bucket;

	public S3Util(S3Client s3Client, S3Presigner s3Presigner) {
		this.s3Client = s3Client;
		this.s3Presigner = s3Presigner;
	}

	/**
	 * S3에 파일을 업로드하고 objectKey를 반환합니다.
	 * @param file 업로드할 파일
	 * @param directory 버킷 내 디렉토리 (S3Directory enum)
	 * @return S3 object key
	 */
	public String uploadAndGetKey(MultipartFile file, S3Directory directory) {
		String objectKey = directory.getPath() + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();

		try {
			PutObjectRequest putObjectRequest = PutObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.contentType(file.getContentType())
				.contentLength(file.getSize())
				.build();

			RequestBody requestBody = RequestBody.fromInputStream(
				file.getInputStream(),
				file.getSize()
			);

			s3Client.putObject(putObjectRequest, requestBody);
			return objectKey;
		} catch (IOException e) {
			throw BusinessException.from(ExceptionCode.S3_UPLOAD_FAILED);
		} catch (S3Exception e) {
			throw BusinessException.from(ExceptionCode.S3_UPLOAD_FAILED);
		}
	}

	/**
	 * objectKey를 사용하여 S3에서 파일을 삭제합니다.
	 * @param objectKey S3 object key
	 */
	public void deleteByKey(String objectKey) {
		try {
			DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.build();

			s3Client.deleteObject(deleteObjectRequest);
		} catch (S3Exception e) {
			throw BusinessException.from(ExceptionCode.S3_DELETE_FAILED);
		}
	}

	/**
	 * objectKey로부터 presigned URL을 생성합니다.
	 * @param objectKey S3 object key
	 * @param expiration 만료 시간 (Duration)
	 * @return presigned URL
	 */
	public String generatePresignedUrl(String objectKey, Duration expiration) {
		try {
			GetObjectRequest getObjectRequest = GetObjectRequest.builder()
				.bucket(bucket)
				.key(objectKey)
				.build();

			GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
				.signatureDuration(expiration)
				.getObjectRequest(getObjectRequest)
				.build();

			PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
			return presignedRequest.url().toString();
		} catch (S3Exception e) {
			throw BusinessException.from(ExceptionCode.S3_URL_GENERATION_FAILED);
		}
	}

	/**
	 * objectKey로부터 presigned URL을 생성합니다. (기본 만료 시간: 1시간)
	 * @param objectKey S3 object key
	 * @return presigned URL
	 */
	// TODO: 검토 필요 (테스트를 위해 24시간으로 해둠)
	public String generatePresignedUrl(String objectKey) {
		return generatePresignedUrl(objectKey, Duration.ofHours(24));
	}
}
