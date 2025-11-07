package com.zzik.backend.domain.cost.entity;

import java.util.List;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cost")
public class Cost extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "created_by",
		nullable = false,
		foreignKey = @ForeignKey(foreignKeyDefinition = "FOREIGN KEY (created_by) REFERENCES member(id) ON DELETE RESTRICT")
	)
	private Member createdBy;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "payer_id",
		nullable = false,
		foreignKey = @ForeignKey(foreignKeyDefinition = "FOREIGN KEY (payer_id) REFERENCES member(id) ON DELETE RESTRICT")
	)
	private Member payer;

	@Column(name = "paid_at", columnDefinition = "TEXT", nullable = false)
	private String paidAt;

	@Column(name = "place", length = 200, nullable = false)
	private String place;

	@Column(name = "total_amount", nullable = false)
	private Long totalAmount;

	@Column(name = "memo", columnDefinition = "TEXT")
	private String memo;

	@Column(name = "receipt", columnDefinition = "TEXT")
	private String receipt;

	@Column(name = "receipt_url", length = 1024)
	private String receiptUrl; // S3 object key (presigned URL 생성에 사용)

	// costMenu와의 양방향 매핑
	@OneToMany(mappedBy = "cost", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<CostMenu> costMenus;

	@Builder
	public Cost(Trip trip, Member createdBy, Member payer, String paidAt,
		String place, Long totalAmount, String memo, String receipt, String receiptUrl) {
		this.trip = trip;
		this.createdBy = createdBy;
		this.payer = payer;
		this.paidAt = paidAt;
		this.place = place;
		this.totalAmount = totalAmount;
		this.memo = memo;
		this.receipt = receipt;
		this.receiptUrl = receiptUrl;
	}
}
