// package com.zzik.backend.domain.management.entity;
//
// import com.zzik.backend.domain.auth.entity.Member;
// import com.zzik.backend.global.base.entity.BaseEntity;
// import jakarta.persistence.*;
// import lombok.AccessLevel;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
//
// @Entity
// @Table(name = "face_image")
// @Getter
// @NoArgsConstructor(access = AccessLevel.PROTECTED)
// public class FaceImage extends BaseEntity {
//
// 	@Id
// 	@GeneratedValue(strategy = GenerationType.IDENTITY)
// 	private Long id;
//
// 	@ManyToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "member_id", nullable = false)
// 	private Member member;
//
// 	@Column(name = "image_url", nullable = false, length = 1024)
// 	private String imageUrl;
//
// 	@Builder
// 	public FaceImage(Member member, String imageUrl) {
// 		this.member = member;
// 		this.imageUrl = imageUrl;
// 	}
// }
