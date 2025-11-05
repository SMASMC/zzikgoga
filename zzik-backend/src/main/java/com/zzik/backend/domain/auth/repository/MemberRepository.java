package com.zzik.backend.domain.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.enums.Provider;

/**
 * 회원 Repository
 */
@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {

	// 이메일로 회원 존재 여부 확인
	boolean existsByEmail(String email);

	// 이메일로 회원 조회
	Optional<Member> findByEmail(String email);

	// OAuth Provider와 Provider ID로 회원 조회
	Optional<Member> findByProviderAndProviderId(Provider provider, String providerId);

	boolean existsByProviderAndProviderId(Provider provider, String providerId);
}
