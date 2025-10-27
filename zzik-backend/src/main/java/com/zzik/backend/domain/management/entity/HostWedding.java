package com.zzik.backend.domain.management.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "host_wedding")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HostWedding extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "wedding_id", nullable = false)
	private Wedding wedding;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "host_id", nullable = false)
	private Host host;

	@Builder
	public HostWedding(Wedding wedding, Host host) {
		this.wedding = wedding;
		this.host = host;
	}
}
