// package com.zzik.backend.domain.management.entity;
//
// import com.zzik.backend.domain.management.enums.Relation;
// import com.zzik.backend.global.base.entity.BaseEntity;
// import jakarta.persistence.*;
// import lombok.AccessLevel;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
//
// @Entity
// @Table(name = "kindred_account_info")
// @Getter
// @NoArgsConstructor(access = AccessLevel.PROTECTED)
// public class KindredAccountInfo extends BaseEntity {
//
// 	@Id
// 	@GeneratedValue(strategy = GenerationType.IDENTITY)
// 	private Long id;
//
// 	@ManyToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "wedding_id", nullable = false)
// 	private Wedding wedding;
//
// 	@Enumerated(EnumType.STRING)
// 	@Column(name = "relation", nullable = false)
// 	private Relation relation;
//
// 	@Column(name = "bank_name", nullable = false, length = 20)
// 	private String bankName;
//
// 	@Column(name = "account_number", nullable = false, length = 20)
// 	private String accountNumber;
//
// 	@Column(name = "account_holder", nullable = false, length = 20)
// 	private String accountHolder;
//
// 	@Builder
// 	public KindredAccountInfo(Wedding wedding, Relation relation, String bankName, String accountNumber, String accountHolder) {
// 		this.wedding = wedding;
// 		this.relation = relation;
// 		this.bankName = bankName;
// 		this.accountNumber = accountNumber;
// 		this.accountHolder = accountHolder;
// 	}
//
// }
