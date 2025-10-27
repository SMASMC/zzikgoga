package com.zzik.backend.domain.plan.repository;

import com.zzik.backend.domain.plan.entity.Thema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 테마 Repository
 */
@Repository
public interface ThemaRepository extends JpaRepository<Thema, Long> {

	// 이름으로 테마 조회
	Optional<Thema> findByName(String name);
}
