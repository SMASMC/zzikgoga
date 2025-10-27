package com.zzik.backend.domain.management.service;

/*
 * 견본용 코드 - 현재 주석처리됨
 * 실제 사용 시 주석 해제 필요
 */

/*
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.management.dto.request.SignUpRequest;
import com.zzik.backend.domain.management.dto.response.SignUpResponse;
import com.zzik.backend.domain.management.entity.Host;
import com.zzik.backend.domain.management.enums.MemberType;
import com.zzik.backend.domain.management.repository.HostRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class MemberService {

	private final MemberRepository memberRepository;
	private final HostRepository hostRepository;
	private final PasswordEncoder passwordEncoder;

	public SignUpResponse registerBrideOrGroom(SignUpRequest request) {
		// TODO: 휴대폰 인증 여부 확인하기 (Redis 등)
		if (memberRepository.existsByPhone(request.phone())) {
			throw BusinessException.from(ExceptionCode.EXISTS_PHONE_NUMBER);
		}

		Member savedMember = memberRepository.save(
			Member.createHostMember(request.name(), request.phone())
		);

		hostRepository.save(
			Host.createHost(
				savedMember,
				passwordEncoder.encode(request.password()),
				request.gender(),
				generateUniqueSpouseCode()
			)
		);

		return new SignUpResponse(
			savedMember.getId(),
			MemberType.TEMP_HOST.name()
		);
	}

	private String generateUniqueSpouseCode() {
		String spouseCode;
		do {
			spouseCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
		} while (hostRepository.existsBySpouseCode(spouseCode));

		return spouseCode;
	}
}
*/