// package com.zzik.backend.domain.management.entity;
//
// import com.zzik.backend.global.base.entity.BaseEntity;
// import jakarta.persistence.*;
// import lombok.AccessLevel;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
//
// @Entity
// @Table(name = "invitation")
// @Getter
// @NoArgsConstructor(access = AccessLevel.PROTECTED)
// public class Invitation extends BaseEntity {
//
// 	@Id
// 	@GeneratedValue(strategy = GenerationType.IDENTITY)
// 	private Long id;
//
// 	@OneToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "wedding_id", nullable = false)
// 	private Wedding wedding;
//
// 	@Column(name = "invitation_url", nullable = false, length = 500)
// 	private String invitationUrl;
//
// 	@Column(name = "cover_image_url", nullable = false, length = 1024)
// 	private String coverImageUrl;
//
// 	@Column(name = "invitation_message", length = 500)
// 	private String invitationMessage;
//
// 	@Column(name = "theme_data", nullable = false, columnDefinition = "TEXT")
// 	private String themeData;
//
// 	@Builder
// 	public Invitation(Wedding wedding, String invitationUrl, String coverImageUrl, String invitationMessage, String themeData) {
// 		this.wedding = wedding;
// 		this.invitationUrl = invitationUrl;
// 		this.coverImageUrl = coverImageUrl;
// 		this.invitationMessage = invitationMessage;
// 		this.themeData = themeData;
// 	}
// }
