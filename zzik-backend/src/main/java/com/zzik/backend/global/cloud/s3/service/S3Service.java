package com.zzik.backend.global.cloud.s3.service;

import java.io.InputStream;
import java.net.URL;
import java.time.Duration;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * S3 파일 관리 서비스 레이어
 *
 * <p>Photo, Cost 등 여러 도메인에서 공통으로 사용하는 S3 비즈니스 로직을 제공합니다.</p>
 *
 * <h3>주요 기능</h3>
 * <ul>
 *   <li>object key 생성 및 관리</li>
 *   <li>presigned URL 생성 (기본 1시간 만료)</li>
 *   <li>파일 업로드/삭제</li>
 * </ul>
 *
 * <h3>중요 사항</h3>
 * <ul>
 *   <li>엔티티에는 <b>전체 URL이 아닌 object key</b>를 저장합니다</li>
 *   <li>클라이언트에게는 {@link #getPresignedUrl(String)}로 생성한 presigned URL을 반환합니다</li>
 *   <li>presigned URL은 기본 1시간 후 만료됩니다</li>
 * </ul>
 *
 * <h3>사용 예제 - PhotoService</h3>
 * <pre>{@code
 * @Service
 * @RequiredArgsConstructor
 * public class PhotoService {
 *     private final S3Service s3Service;
 *     private final PhotoRepository photoRepository;
 *
 *     // 1. 파일 업로드 및 저장
 *     public PhotoResponse uploadPhoto(MultipartFile file, Long tripId) {
 *         // S3에 업로드하고 object key 받기
 *         String objectKey = s3Service.uploadFile(file, S3Directory.PHOTO);
 *
 *         // DB에 object key 저장 (URL 아님!)
 *         Photo photo = Photo.builder()
 *             .s3Url(objectKey)  // object key 저장
 *             .tripId(tripId)
 *             .build();
 *         photoRepository.save(photo);
 *
 *         // 클라이언트에게 presigned URL 반환
 *         String presignedUrl = s3Service.getPresignedUrl(objectKey);
 *         return new PhotoResponse(photo.getId(), presignedUrl);
 *     }
 *
 *     // 2. 사진 조회 시 presigned URL 생성
 *     public PhotoResponse getPhoto(Long photoId) {
 *         Photo photo = photoRepository.findById(photoId)
 *             .orElseThrow(() -> new NotFoundException("Photo not found"));
 *
 *         // DB에서 object key 조회 후 presigned URL 생성
 *         String presignedUrl = s3Service.getPresignedUrl(photo.getS3Url());
 *
 *         return new PhotoResponse(photo.getId(), presignedUrl);
 *     }
 *
 *     // 3. 사진 삭제
 *     public void deletePhoto(Long photoId) {
 *         Photo photo = photoRepository.findById(photoId)
 *             .orElseThrow(() -> new NotFoundException("Photo not found"));
 *
 *         // S3에서 파일 삭제
 *         s3Service.deleteFile(photo.getS3Url());
 *
 *         // DB에서도 삭제
 *         photoRepository.delete(photo);
 *     }
 * }
 * }</pre>
 *
 * <h3>사용 예제 - CostService</h3>
 * <pre>{@code
 * @Service
 * @RequiredArgsConstructor
 * public class CostService {
 *     private final S3Service s3Service;
 *     private final CostRepository costRepository;
 *
 *     // 영수증 이미지 업로드
 *     public CostResponse uploadReceipt(MultipartFile file, SaveCostRequest request) {
 *         // S3에 업로드
 *         String objectKey = s3Service.uploadFile(file, S3Directory.RECEIPT);
 *
 *         // DB에 object key 저장
 *         Cost cost = Cost.builder()
 *             .receiptUrl(objectKey)  // object key 저장
 *             .place(request.getPlace())
 *             .totalAmount(request.getTotalAmount())
 *             .build();
 *         costRepository.save(cost);
 *
 *         // 응답에는 presigned URL 포함
 *         String presignedUrl = s3Service.getPresignedUrl(objectKey);
 *         return new CostResponse(cost.getId(), presignedUrl);
 *     }
 *
 *     // 영수증 조회 (24시간 만료 URL)
 *     public String getReceiptUrl(Long costId) {
 *         Cost cost = costRepository.findById(costId)
 *             .orElseThrow(() -> new NotFoundException("Cost not found"));
 *
 *         // 24시간 만료 presigned URL 생성
 *         return s3Service.getPresignedUrl(cost.getReceiptUrl(), Duration.ofHours(24));
 *     }
 * }
 * }</pre>
 *
 * @see S3Util
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {
	private final S3Util s3Util;

	/**
	 * 파일을 업로드하고 object key를 반환합니다.
	 *
	 * @param file 업로드할 파일
	 * @param directory 저장할 디렉토리 (S3Directory enum 사용)
	 * @return S3 object key
	 */
	public String uploadFile(MultipartFile file, S3Directory directory) {
		log.debug("Uploading file to S3: directory={}, filename={}", directory.getPath(), file.getOriginalFilename());
		String objectKey = s3Util.uploadAndGetKey(file, directory);
		log.info("File uploaded successfully: objectKey={}", objectKey);
		return objectKey;
	}

	/**
	 * object key로부터 presigned URL을 생성합니다. (기본 만료 시간: 1시간)
	 *
	 * @param objectKey S3 object key
	 * @return presigned URL (1시간 만료)
	 */
	public String getPresignedUrl(String objectKey) {
		if (objectKey == null || objectKey.isBlank()) {
			return null;
		}
		return s3Util.generatePresignedUrl(objectKey);
	}

	/**
	 * object key로부터 presigned URL을 생성합니다.
	 *
	 * @param objectKey S3 object key
	 * @param expiration 만료 시간
	 * @return presigned URL
	 */
	public String getPresignedUrl(String objectKey, Duration expiration) {
		if (objectKey == null || objectKey.isBlank()) {
			return null;
		}
		return s3Util.generatePresignedUrl(objectKey, expiration);
	}

	/**
	 * object key를 사용하여 파일을 삭제합니다.
	 *
	 * @param objectKey S3 object key
	 */
	public void deleteFile(String objectKey) {
		if (objectKey == null || objectKey.isBlank()) {
			log.warn("Cannot delete file: objectKey is null or empty");
			return;
		}
		log.debug("Deleting file from S3: objectKey={}", objectKey);
		s3Util.deleteByKey(objectKey);
		log.info("File deleted successfully: objectKey={}", objectKey);
	}

	/**
	 * 기존 URL을 object key로 변환합니다. (마이그레이션용 유틸리티)
	 *
	 * @param url S3 전체 URL
	 * @return object key (버킷명 제외)
	 */
	public String extractKeyFromUrl(String url) {
		if (url == null || url.isBlank()) {
			return null;
		}
		// URL 형식: https://bucket-name.s3.region.amazonaws.com/directory/uuid_filename.ext
		// 또는: https://s3.region.amazonaws.com/bucket-name/directory/uuid_filename.ext
		try {
			int lastSlashIndex = url.lastIndexOf('/');
			if (lastSlashIndex > 0 && lastSlashIndex < url.length() - 1) {
				// 마지막 슬래시 이후의 파일명만 추출하는 것이 아니라,
				// 버킷 이름 이후의 전체 경로를 추출해야 합니다
				String[] parts = url.split("\\.amazonaws\\.com/");
				if (parts.length == 2) {
					return parts[1]; // directory/uuid_filename.ext
				}
			}
			return null;
		} catch (Exception e) {
			log.error("Failed to extract key from URL: {}", url, e);
			return null;
		}
	}

	/** Presigned URL로 파일 다운로드 후 byte[] 반환 */
	public byte[] downloadBytes(String presignedUrl) {
		try (InputStream in = new URL(presignedUrl).openStream()) {
			return in.readAllBytes();
		} catch (Exception e) {
			throw new RuntimeException("Failed to download bytes from S3: " + e.getMessage());
		}
	}
}
