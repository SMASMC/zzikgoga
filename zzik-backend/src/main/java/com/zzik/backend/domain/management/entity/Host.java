// package com.zzik.backend.domain.management.entity;
//
// import com.zzik.backend.domain.auth.entity.Member;
// import com.zzik.backend.domain.auth.enums.Gender;
// import com.zzik.backend.global.base.entity.BaseEntity;
// import jakarta.persistence.*;
// import lombok.AccessLevel;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
//
// @Entity
// @Table(name = "host")
// @Getter
// @NoArgsConstructor(access = AccessLevel.PROTECTED)
// public class Host extends BaseEntity {
//
// 	@Id
// 	@GeneratedValue(strategy = GenerationType.IDENTITY)
// 	private Long id;
//
// 	@OneToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "member_id", nullable = false)
// 	private Member member;
//
// 	@Column(name = "password", length = 256)
// 	private String password;
//
// 	@Enumerated(EnumType.STRING)
// 	@Column(name = "gender", nullable = false)
// 	private Gender gender;
//
// 	@Column(name = "spouse_code", nullable = false, length = 50)
// 	private String spouseCode;
//
// 	@Builder
// 	public Host(Member member, String password, Gender gender, String spouseCode) {
// 		this.member = member;
// 		this.password = password;
// 		this.gender = gender;
// 		this.spouseCode = spouseCode;
// 	}
//
// 	public static Host createHost(Member member, String encodedPassword, Gender gender, String spouseCode) {
// 		return Host.builder()
// 			.member(member)
// 			.password(encodedPassword)
// 			.gender(gender)
// 			.spouseCode(spouseCode)
// 			.build();
// 	}
// }
