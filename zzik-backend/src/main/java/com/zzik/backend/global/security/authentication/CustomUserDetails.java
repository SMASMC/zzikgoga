package com.zzik.backend.global.security.authentication;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.zzik.backend.domain.auth.entity.Member;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PRIVATE, force = true)
public class CustomUserDetails implements UserDetails {
	private static final String ROLE_PREFIX = "ROLE_";
	private final Long userId;
	private final String username;
	private Collection<? extends GrantedAuthority> authorities;

	@Builder
	private CustomUserDetails(Long userId, String username,
		Collection<? extends GrantedAuthority> authorities) {
		this.userId = userId;
		this.username = username;
		this.authorities = authorities;
	}

	public static CustomUserDetails from(Member member) {
		return CustomUserDetails.builder()
			.userId(member.getId())
			.username(member.getName())
			/* 추후 role 기반이 필요할 때, Member 테이블 및 엔티티에 role 컬럼 추가 및 아래 코드 사용 할 것*/
			//.authorities(List.of(new SimpleGrantedAuthority(ROLE_PREFIX + member.getMemberType().name())))
			.authorities(List.of(new SimpleGrantedAuthority(ROLE_PREFIX + "USER")))
			.build();
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public String getPassword() {
		throw new UnsupportedOperationException();
	}

	@Override
	public String getUsername() {
		return username;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return true;
	}
}
