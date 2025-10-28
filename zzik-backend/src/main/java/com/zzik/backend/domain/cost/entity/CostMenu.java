package com.zzik.backend.domain.cost.entity;

import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cost_menu")
public class CostMenu extends BaseEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "cost_id", nullable = false)
	private Long costId;

	@Column(name = "menu_name", length = 200, nullable = false)
	private String menuName;

	@Column(name = "amount", nullable = false)
	private Long amount;

	@Column(name = "n_cost_menu_member", nullable = false)
	private Byte nCostMenuMember;
}
