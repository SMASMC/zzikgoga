package com.zzik.backend.domain.auth.repository;

import com.zzik.backend.domain.auth.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 회원 Repository
 */
@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {

	// 이메일로 회원 존재 여부 확인
	boolean existsByEmail(String email);

	// 전화번호로 회원 존재 여부 확인 (management 도메인 호환용)
	boolean existsByPhone(String phone);

	// 이메일로 회원 조회
	Optional<Member> findByEmail(String email);

	// OAuth Provider와 Provider ID로 회원 조회
	Optional<Member> findByProviderAndProviderId(String provider, String providerId);
}
