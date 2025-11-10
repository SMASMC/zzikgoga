package com.zzik.backend.domain.media.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

	/**
	 * @param tripId   여행 ID
	 * @param cursor   이 ID보다 작은(이전) 사진들을 조회 (첫 페이지는 NULL)
	 * @param pageable 조회할 개수 (limit)
	 * @return 사진 목록
	 */
	@Query("SELECT p FROM Photo p " +
		"JOIN FETCH p.member m " +
		"WHERE p.trip.id = :tripId AND " +
		"(:cursor IS NULL OR p.id < :cursor) " +
		"ORDER BY p.id DESC")
	List<Photo> findByTripIdCursorPaged(
		@Param("tripId") Long tripId,
		@Param("cursor") Long cursor,
		Pageable pageable
	);

}
