package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "cost_menu")
public class CostMenu extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "cost_id", nullable = false)
	private Cost cost;

	@Column(name = "menu_name", length = 200, nullable = false)
	private String menuName;

	@Column(name = "amount", nullable = false)
	private Long amount;

	@Column(name = "must_payer_ids", columnDefinition = "JSONB")
	private String mustPayerIds;

	public void setCost(Cost cost) {
		this.cost = cost;
	}

	public void setMustPayerIds(String mustPayerIds) {
		this.mustPayerIds = mustPayerIds;
	}

	@Builder
	public CostMenu(Cost cost, String menuName, Long amount, String mustPayerIds) {
		this.cost = cost;
		this.menuName = menuName;
		this.amount = amount;
		this.mustPayerIds = mustPayerIds;
	}
}
