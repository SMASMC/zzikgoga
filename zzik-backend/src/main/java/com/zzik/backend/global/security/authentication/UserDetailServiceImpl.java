package com.zzik.backend.global.security.authentication;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.zzik.backend.domain.auth.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserDetailServiceImpl implements UserDetailsService {
	private static final String NOT_FOUND_MESSAGE = "사용자를 찾을 수 없습니다.";
	private final MemberRepository memberRepository;

	@Override
	public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
		return memberRepository.findById(Long.parseLong(userId))
			.map(CustomUserDetails::from)
			.orElseThrow(() -> new UsernameNotFoundException(NOT_FOUND_MESSAGE));
	}
}
