package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.global.base.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 비용 엔티티
 * 여행 중 발생한 비용(영수증) 정보를 관리합니다.
 */
@Entity
@Table(name = "cost")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Cost extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "created_by", nullable = false)
	private Member createdBy; // 비용을 등록한 회원 (FK to member.id)

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "payer_id", nullable = false)
	private Member payer; // 실제 결제한 회원 (FK to member.id)

	@Column(name = "paid_at", nullable = false, columnDefinition = "TEXT")
	private String paidAt; // 결제 일시 (OCR 인식의 형식 불일치 한계로 TEXT 사용, 정렬 기능 미제공)

	@Column(name = "place", nullable = false, length = 200)
	private String place; // 결제 장소

	@Column(name = "total_amount", nullable = false)
	private Long totalAmount; // 총 금액

	@Column(name = "memo", columnDefinition = "TEXT")
	private String memo; // 메모

	@Column(name = "receipt", nullable = false, columnDefinition = "TEXT")
	private String receipt; // 영수증 이미지 URL 또는 데이터

	// 양방향 연관관계 - 비용에 속한 메뉴 항목들
	@OneToMany(mappedBy = "cost", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CostMenu> costMenus = new ArrayList<>();

	@Builder
	public Cost(Trip trip, Member createdBy, Member payer, String paidAt,
				String place, Long totalAmount, String memo, String receipt) {
		this.trip = trip;
		this.createdBy = createdBy;
		this.payer = payer;
		this.paidAt = paidAt;
		this.place = place;
		this.totalAmount = totalAmount;
		this.memo = memo;
		this.receipt = receipt;
	}
}
