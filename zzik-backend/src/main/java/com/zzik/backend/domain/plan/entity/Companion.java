package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 동반자 엔티티
 * 여행 동반자의 기본 정보를 관리합니다.
 */
@Entity
@Table(name = "companion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Companion extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, length = 50)
	private String name; // 동반자 이름

	@Builder
	public Companion(String name) {
		this.name = name;
	}
}
