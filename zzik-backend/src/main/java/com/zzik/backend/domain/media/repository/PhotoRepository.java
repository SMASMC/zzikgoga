package com.zzik.backend.domain.media.repository;

import com.zzik.backend.domain.media.entity.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 사진 Repository
 */
@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

	// 여행 ID로 사진 목록 조회
	List<Photo> findByTripId(Long tripId);

	// 회원 ID로 사진 목록 조회
	List<Photo> findByMemberId(Long memberId);

	// 여행 ID와 영수증 여부로 사진 목록 조회
	List<Photo> findByTripIdAndIsCost(Long tripId, Boolean isCost);
}
