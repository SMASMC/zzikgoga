package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 일정 Repository
 */
@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

	// 여행 ID로 일정 목록 조회
	List<Schedule> findByTripId(Long tripId);
}
