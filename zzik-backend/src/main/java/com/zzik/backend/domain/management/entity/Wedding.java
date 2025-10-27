package com.zzik.backend.domain.management.entity;

import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "wedding")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wedding extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "wedding_date", nullable = false)
	private LocalDateTime weddingDate;

	@Column(name = "venue_name", nullable = false, length = 100)
	private String venueName;

	@Column(name = "venue_address", nullable = false, length = 200)
	private String venueAddress;

	@Column(name = "hall_name", nullable = false, length = 50)
	private String hallName;

	@Builder
	public Wedding(LocalDateTime weddingDate, String venueName, String venueAddress, String hallName) {
		this.weddingDate = weddingDate;
		this.venueName = venueName;
		this.venueAddress = venueAddress;
		this.hallName = hallName;
	}
}
