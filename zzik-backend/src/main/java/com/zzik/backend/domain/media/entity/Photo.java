package com.zzik.backend.domain.media.entity;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사진 엔티티
 * 여행 중 촬영한 사진 및 이미지를 관리합니다.
 */
@Entity
@Table(name = "photo")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Photo extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "member_id", nullable = false)
	private Member member; // 사진을 업로드한 회원 (FK to member.id)

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // 사진이 속한 여행 (FK to trip.id)

	@Column(name = "s3_url", length = 1024, nullable = false)
	private String s3Url; // S3에 저장된 사진 URL

	@Builder
	public Photo(Member member, Trip trip, String s3Url) {
		this.member = member;
		this.trip = trip;
		this.s3Url = s3Url;
	}
}
