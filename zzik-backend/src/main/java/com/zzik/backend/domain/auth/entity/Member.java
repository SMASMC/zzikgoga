package com.zzik.backend.domain.auth.entity;

import org.hibernate.annotations.JdbcType;

import com.zzik.backend.domain.auth.enums.Gender;
import com.zzik.backend.domain.auth.enums.Provider;
import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원 엔티티
 * OAuth 소셜 로그인과 자체 로그인을 모두 지원하기 위한 회원 정보를 관리합니다.
 */
@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY) // PostgreSQL의 BIGSERIAL은 IDENTITY 전략 사용
	private Long id;

	@Column(name = "email", nullable = false, unique = true, length = 255)
	private String email; // 이메일 (고유값)

	@Column(name = "password", length = 128)
	private String password; // Argon2로 단방향 암호화, 추후 자체 로그인 확장성을 고려하여 nullable

	@Enumerated(EnumType.STRING) // ENUM을 문자열로 저장 (PostgreSQL의 provider_type과 매핑)
	@Column(name = "provider", nullable = false, columnDefinition = "member_provider")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private Provider provider; // OAuth 제공자 (KAKAO, GOOGLE, NAVER)

	@Column(name = "provider_id", nullable = false, unique = true, length = 128)
	private String providerId; // OAuth 제공자의 고유 ID

	@Column(name = "name", nullable = false, length = 50)
	private String name; // 회원 이름

	@Enumerated(EnumType.STRING) // ENUM을 문자열로 저장 (PostgreSQL의 gender_type과 매핑)
	@Column(name = "gender", nullable = false, columnDefinition = "member_gender")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private Gender gender; // 성별 (MALE, FEMALE)

	@Column(name = "birth_year", nullable = false)
	private Short birthYear; // 출생년도 (카카오 OAuth로부터 받아옴)

	// 계좌 정보는 회원가입 시 선택사항 (추후 정산 시 필요)
	@Column(name = "bank_code", nullable = true, length = 50)
	private String bankCode; // 은행 코드 (노션의 mapping 페이지 참고)

	@Column(name = "account_num", nullable = true, length = 50)
	private String accountNum; // 계좌번호

	@Column(name = "thumbnail_url", length = 1024)
	private String thumbnailUrl; // 프로필 썸네일 URL (null이면 이름 기반 썸네일 사용)

	@Column(name = "wallet_address", nullable = false, length = 255, columnDefinition = "VARCHAR(255) DEFAULT ''")
	private String walletAddress = ""; // 블록체인 지갑 주소

	@Column(name = "wallet_private_key", nullable = false, columnDefinition = "TEXT DEFAULT ''")
	private String walletPrivateKey = ""; // 블록체인 지갑 개인키 (Spring Security로 암호화 필수!)

	@Column(name = "remaining_arweave_uses", nullable = false, columnDefinition = "SMALLINT DEFAULT 1")
	private Short remainingArweaveUses = 1; // 남은 Arweave 사용 횟수

	@Builder
	public Member(String email, String phone, String password, Provider provider, String providerId,
		String name, Gender gender, Short birthYear, String bankCode,
		String accountNum, String thumbnailUrl, String walletAddress,
		String walletPrivateKey, Short remainingArweaveUses) {
		this.email = email;
		this.password = password;
		this.provider = provider;
		this.providerId = providerId;
		this.name = name;
		this.gender = gender;
		this.birthYear = birthYear;
		this.bankCode = bankCode;
		this.accountNum = accountNum;
		this.thumbnailUrl = thumbnailUrl;
		this.walletAddress = walletAddress != null ? walletAddress : "";
		this.walletPrivateKey = walletPrivateKey != null ? walletPrivateKey : "";
		this.remainingArweaveUses = remainingArweaveUses != null ? remainingArweaveUses : 1;
	}

	/**
	 * OAuth 소셜 로그인용 회원 생성 팩토리 메서드
	 */
	public static Member createOAuthMember(String email, Provider provider, String providerId,
		String name, Gender gender, Short birthYear,
		String bankCode, String accountNum) {
		return Member.builder()
			.email(email)
			.phone(null)
			.password(null) // OAuth 로그인은 비밀번호 없음
			.provider(provider)
			.providerId(providerId)
			.name(name)
			.gender(gender)
			.birthYear(birthYear)
			.bankCode(bankCode)
			.accountNum(accountNum)
			.thumbnailUrl(null)
			.walletAddress("")
			.walletPrivateKey("")
			.remainingArweaveUses((short)1)
			.build();
	}

	/**
	 * 결혼식 호스트용 임시 회원 생성 팩토리 메서드 (management 도메인 호환용)
	 * TODO: 실제 비즈니스 요구사항에 맞게 조정 필요
	 */
	public static Member createHostMember(String name, String phone) {
		return Member.builder()
			.email(phone + "@temp.com") // 임시 이메일 (phone을 기반으로)
			.phone(phone)
			.password(null)
			.provider(Provider.KAKAO) // 임시값
			.providerId("temp_" + phone)
			.name(name)
			.gender(Gender.MALE) // 임시값
			.birthYear((short)1990) // 임시값
			.bankCode("") // 임시값
			.accountNum("") // 임시값
			.thumbnailUrl(null)
			.walletAddress("")
			.walletPrivateKey("")
			.remainingArweaveUses((short)1)
			.build();
	}

	public void setRemainingArweaveUses(short remainingArweaveUses) {
		this.remainingArweaveUses = remainingArweaveUses;
	}

}
