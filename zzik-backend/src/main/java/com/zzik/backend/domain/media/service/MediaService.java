package com.zzik.backend.domain.media.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import net.coobird.thumbnailator.Thumbnails;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Directory;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.media.dto.response.PhotoDetailResponse;
import com.zzik.backend.domain.media.dto.response.PhotoListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadResponse;
import com.zzik.backend.domain.media.entity.Photo;
import com.zzik.backend.domain.media.repository.PhotoRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.cloud.s3.service.S3Directory;
import com.zzik.backend.global.cloud.s3.service.S3Service;
import com.zzik.backend.global.cloud.s3.service.S3Util;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.pagination.PageInfoResponse;
import com.zzik.backend.global.util.ByteArrayMultipartFile;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class MediaService {

	private final PhotoRepository photoRepository;
	private final MemberRepository memberRepository;
	private final TripRepository tripRepository;
	private final TripMemberRepository tripMemberRepository;
	private final S3Service s3Service;
	private final S3Util s3Util;

	private static final float WEBP_QUALITY = 0.6f;
	private static final int MAX_IMAGE_DIMENSION = 2000;

	// 50MB
	private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
	// 허용되는 이미지 확장자
	private static final List<String> ALLOWED_EXTENSIONS = List.of(
		"jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif"
	);

	/**
	 * 다중 사진 업로드
	 */
	public PhotoUploadListResponse uploadPhotos(Long tripId, MultipartFile[] files, Long memberId) {

		// (1, 2번 로직 동일)
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));
		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));
		checkTripMembership(tripId, memberId);

		List<PhotoUploadResponse> uploadedList = new ArrayList<>();

		for (MultipartFile file : files) {
			try { // 👈 [추가] 개별 파일 처리 시 예외 처리
				// 3-1. 개별 파일 유효성 검사
				validateFile(file);

				// 3-2. [신규] 이미지 처리 (EXIF 회전 및 WebP 변환)
				MultipartFile processedFile = processAndPrepareFile(file);

				// 3-3. S3에 *처리된 파일* 업로드
				String s3Url = s3Service.uploadFile(processedFile, S3Directory.PHOTO);

				// 3-4. Photo 엔티티 생성
				Photo photo = Photo.builder()
					.member(member)
					.trip(trip)
					.s3Url(s3Url) // S3Util이 Key를 반환한다고 가정
					.build();

				// 3-5. DB 저장
				Photo savedPhoto = photoRepository.save(photo);
				uploadedList.add(new PhotoUploadResponse(savedPhoto.getId(), savedPhoto.getS3Url()));

			} catch (Exception e) {
				// 개별 파일 업로드 실패 시 로깅 (전체 실패 X)
				log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
			}
		}
		return new PhotoUploadListResponse(uploadedList);
	}

	public PhotoUploadResponse uploadPhoto(Long tripId, MultipartFile file, Long memberId) {

		// 1. 파일 유효성 검사 (크기, 확장자, null 여부)
		validateFile(file);

		// 2. 엔티티 조회 (Member, Trip)
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		// 3. 권한 검사 (업로더가 해당 여행의 멤버인지 확인)
		checkTripMembership(tripId, memberId);

		// 4. S3에 파일 업로드
		String s3Url;
		s3Url = s3Service.uploadFile(file, S3Directory.PHOTO);

		// 5. Photo 엔티티 생성 및 저장
		Photo photo = Photo.builder()
			.member(member)
			.trip(trip)
			.s3Url(s3Url)
			.build();

		Photo savedPhoto = photoRepository.save(photo);

		// 6. 응답 DTO 반환
		return new PhotoUploadResponse(savedPhoto.getId(), savedPhoto.getS3Url());
	}

	/**
	 * 사진 목록 조회 (GET)
	 */
	@Transactional(readOnly = true)
	public PhotoListResponse getPhotos(Long tripId, Long memberId, Long cursor, int size) {

		// 1. 권한 검사 (조회자가 해당 여행의 멤버인지 확인)
		checkTripMembership(tripId, memberId);

		// 2. 페이지네이션 설정 (다음 페이지 유무 확인을 위해 size + 1 조회)
		PageRequest pageRequest = PageRequest.of(0, size + 1);

		// 3. DB 조회 (N+1 방지 Fetch Join 쿼리 사용)
		List<Photo> photos = photoRepository.findByTripIdCursorPaged(tripId, cursor, pageRequest);

		// 4. 페이지네이션 로직 처리 (다음 커서 생성)
		boolean hasNext = photos.size() > size;
		Long nextCursor = null;

		List<Photo> responsePhotos = hasNext ? photos.subList(0, size) : photos;

		if (hasNext) {
			nextCursor = responsePhotos.get(responsePhotos.size() - 1).getId();
		}

		// 5. DTO 변환 (S3 Presigned URL 생성 포함)
		List<PhotoDetailResponse> photoDTOs = responsePhotos.stream()
			.map(photo -> new PhotoDetailResponse(
				photo.getId(),
				photo.getMember().getId(),
				photo.getMember().getName(),
				s3Util.generatePresignedUrl(photo.getS3Url()),
				photo.getCreatedAt()
			))
			.collect(Collectors.toList());

		// 6. 최종 응답 DTO 구성
		PageInfoResponse pageInfo = new PageInfoResponse(nextCursor);
		return new PhotoListResponse(tripId, photoDTOs, pageInfo);
	}

	/**
	 * 파일 유효성을 검사하는 헬퍼 메서드
	 */
	private void validateFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw BusinessException.from(ExceptionCode.INVALID_FILE);
		}

		// 1. 파일 크기 검사
		if (file.getSize() > MAX_FILE_SIZE) {
			throw BusinessException.from(ExceptionCode.FILE_TOO_LARGE);
		}

		// 2. 파일 확장자 검사
		String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
		if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
			throw BusinessException.from(ExceptionCode.INVALID_FILE_EXTENSION);
		}
	}

	/**
	 * 사용자가 해당 여행의 멤버인지 확인
	 */
	private void checkTripMembership(Long tripId, Long memberId) {
		if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
			// 멤버가 아니면 업로드 권한 없음
			throw BusinessException.from(ExceptionCode.FORBIDDEN);
		}
	}

	/**
	 * [New Helper] 이미지를 처리하고 S3에 업로드할 준비
	 * (EXIF 회전 + WebP 압축)
	 */
	private MultipartFile processAndPrepareFile(MultipartFile originalFile) throws IOException {

		byte[] imageBytes = originalFile.getBytes();

		// 1. EXIF Orientation 값 읽기
		int orientation = getExifOrientation(imageBytes);

		// 2. BufferedImage로 변환
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));

		// 3. Orientation 값에 따라 이미지 회전
		BufferedImage rotatedImage = rotateImageByOrientation(image, orientation);

		// 4. 회전된 이미지를 WebP로 압축 (Thumbnailator 사용)
		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		Thumbnails.of(rotatedImage)
			.size(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION)
			.outputFormat("jpg")
			.outputQuality(WEBP_QUALITY) // 압축 품질 설정 (e.g., 0.8f)
			.toOutputStream(baos);

		byte[] processedImageBytes = baos.toByteArray();

		// 5. 파일명 변경 (e.g., "image.jpg" -> "image.webp")
		String originalFilename = originalFile.getOriginalFilename();
		String baseName = StringUtils.stripFilenameExtension(originalFilename);
		String newFilename = baseName + ".jpg";

		// 6. byte[]를 ByteArrayMultipartFile로 래핑하여 반환
		return new ByteArrayMultipartFile(
			processedImageBytes,
			originalFile.getName(), // "file"
			newFilename,
			"image/webp" // "image/webp"
		);
	}

	/**
	 * [New Helper] 이미지 byte[]에서 EXIF Orientation 값을 읽음
	 */
	private int getExifOrientation(byte[] imageBytes) {
		try (ByteArrayInputStream in = new ByteArrayInputStream(imageBytes)) {
			Metadata metadata = ImageMetadataReader.readMetadata(in);
			Directory directory = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
			if (directory != null && directory.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
				return directory.getInt(ExifIFD0Directory.TAG_ORIENTATION);
			}
		} catch (Exception e) {
			// EXIF 읽기 실패 시
		}
		return 1; // 기본값 (회전 없음)
	}

	/**
	 * [Helper] Orientation 값에 따라 BufferedImage 회전
	 */
	private BufferedImage rotateImageByOrientation(BufferedImage image, int orientation) throws IOException {
		if (orientation <= 1) {
			return image; // 회전 불필요
		}

		Thumbnails.Builder<BufferedImage> builder = Thumbnails.of(image).size(image.getWidth(), image.getHeight());

		switch (orientation) {
			case 2:
				builder.scale(1.0, -1.0);
				break; // Horizontal flip
			case 3:
				builder.rotate(180);
				break; // 180° rotation
			case 4:
				builder.scale(-1.0, 1.0);
				break; // Vertical flip
			case 5:
				builder.rotate(-90).scale(-1.0, 1.0);
				break; // 90° CCW and vertical flip
			case 6:
				builder.rotate(90);
				break; // 90° CW (세로 사진)
			case 7:
				builder.rotate(90).scale(-1.0, 1.0);
				break; // 90° CW and vertical flip
			case 8:
				builder.rotate(-90);
				break; // 90° CCW (세로 사진)
		}
		return builder.asBufferedImage();
	}
}
