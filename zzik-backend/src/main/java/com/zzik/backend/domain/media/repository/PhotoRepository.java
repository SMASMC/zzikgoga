package com.zzik.backend.domain.media.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.media.entity.Photo;

/**
 * 사진 Repository
 */
@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

	// 여행 ID로 사진 목록 조회
	List<Photo> findByTripId(Long tripId);

	// 회원 ID로 사진 목록 조회
	List<Photo> findByMemberId(Long memberId);

}
