package com.zzik.backend.domain.plan.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 테마 엔티티
 * 여행 테마의 기본 정보를 관리합니다.
 */
@Entity
@Table(name = "thema")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Thema extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, unique = true, length = 50)
	private String name; // 테마 이름 (고유값)

	@Builder
	public Thema(String name) {
		this.name = name;
	}
}
