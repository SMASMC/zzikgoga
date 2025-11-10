package com.zzik.backend.domain.media.service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository; // (존재한다고 가정)
import com.zzik.backend.domain.media.dto.response.PhotoDetailResponse;
import com.zzik.backend.domain.media.dto.response.PhotoListResponse;
import com.zzik.backend.domain.media.dto.response.PhotoUploadListResponse;
import com.zzik.backend.domain.media.entity.Photo;
import com.zzik.backend.domain.media.dto.response.PhotoUploadResponse;
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

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

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

		// 1. 엔티티 조회 및 권한 검사 (반복문 전에 1번만 수행하여 효율화)
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		// 2. 권한 검사 (업로더가 해당 여행의 멤버인지 확인)
		checkTripMembership(tripId, memberId);

		List<PhotoUploadResponse> uploadedList = new ArrayList<>();

		// 3. [반복]
		for (MultipartFile file : files) {

			// 3-1. 개별 파일 유효성 검사 (기존 로직 재사용)
			validateFile(file);

			// 3-2. S3에 파일 업로드
			String s3Url;
			s3Url = s3Service.uploadFile(file, S3Directory.PHOTO);

			// 3-3. Photo 엔티티 생성 (조회해둔 엔티티 사용)
			Photo photo = Photo.builder()
				.member(member)
				.trip(trip)
				.s3Url(s3Url)
				.build();

			// 3-4. DB 저장
			Photo savedPhoto = photoRepository.save(photo);

			// 3-5. 성공 목록에 추가
			uploadedList.add(new PhotoUploadResponse(savedPhoto.getId(), savedPhoto.getS3Url()));
		}

		// 4. 최종 응답 DTO 래핑
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
}
