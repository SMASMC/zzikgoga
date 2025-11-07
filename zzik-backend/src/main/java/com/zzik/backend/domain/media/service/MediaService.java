package com.zzik.backend.domain.media.service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository; // (존재한다고 가정)
import com.zzik.backend.domain.media.entity.Photo;
import com.zzik.backend.domain.media.dto.response.PhotoUploadResponse;
import com.zzik.backend.domain.media.repository.PhotoRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.cloud.s3.service.S3Directory;
import com.zzik.backend.global.cloud.s3.service.S3Service;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
@RequiredArgsConstructor
public class MediaService {

	private final PhotoRepository photoRepository;
	private final MemberRepository memberRepository; // (auth 도메인)
	private final TripRepository tripRepository; // (plan 도메인)
	private final TripMemberRepository tripMemberRepository; // (plan 도메인)
	private final S3Service s3Service;

	// 50MB
	private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;
	// 허용되는 이미지 확장자
	private static final List<String> ALLOWED_EXTENSIONS = List.of(
		"jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif"
	);

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
	 * 파일 유효성을 검사하는 헬퍼 메서드
	 */
	private void validateFile(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw BusinessException.from(ExceptionCode.INVALID_FILE); // (ExceptionCode에 추가 필요)
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
