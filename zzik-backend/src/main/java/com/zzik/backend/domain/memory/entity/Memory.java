package com.zzik.backend.domain.memory.entity;

import org.hibernate.annotations.JdbcType;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.memory.enums.MemoryStatus;
import com.zzik.backend.domain.memory.enums.MintStatus;
import com.zzik.backend.domain.memory.enums.StorageType;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.global.base.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * 추억 엔티티
 * 여행 추억을 PDF/NFT로 저장하고 관리합니다.
 */
@Entity
@Table(name = "memory")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Memory extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "member_id", nullable = false)
	private Member member; // FK to member.id

	@ManyToOne(fetch = FetchType.LAZY) // 지연 로딩
	@JoinColumn(name = "trip_id", nullable = false)
	private Trip trip; // FK to trip.id

	@Column(name = "title", nullable = false, length = 255)
	private String title; // 추억 제목

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, columnDefinition = "memory_status_type")
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	private MemoryStatus status = MemoryStatus.ONPROCESS;

	@Column(name = "content", columnDefinition = "JSONB")
	private String content; // 임시저장 내용 (PostgreSQL JSONB를 String으로 매핑, JSON 직렬화/역직렬화는 애플리케이션에서 처리)

	@Column(name = "pdf_url", length = 1024)
	private String pdfUrl; // PDF 파일 URL

	@Column(name = "arweave_url", length = 1024)
	private String arweaveUrl; // Arweave 분산 저장소 URL

	@Column(name = "nft_id", length = 255)
	private String nftId; // NFT ID

	@Enumerated(EnumType.STRING)
	@Column(name = "mint_status", nullable = false, columnDefinition = "mint_status_type")  // DEFAULT 제거, ENUM 타입 명시
	@JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
	// Hibernate 6에서 PostgreSQL ENUM 지원 (import: org.hibernate.dialect.PostgreSQLEnumJdbcType)
	private MintStatus mintStatus = MintStatus.NONE;

	@Column(name = "mint_hash", length = 255)
	private String mintHash; // NFT 민팅 트랜잭션 해시

	@Enumerated(EnumType.STRING) // ENUM을 문자열로 저장 (PostgreSQL storage_type_type)
	@Column(name = "storage_type")
	private StorageType storageType; // 저장소 타입 (S3/Arweave)

	@Builder
	public Memory(Member member, Trip trip, String title, MemoryStatus status,
		String content, String pdfUrl, String arweaveUrl, String nftId,
		MintStatus mintStatus, String mintHash, StorageType storageType) {
		this.member = member;
		this.trip = trip;
		this.title = title;
		this.status = status != null ? status : MemoryStatus.ONPROCESS;
		this.content = content;
		this.pdfUrl = pdfUrl;
		this.arweaveUrl = arweaveUrl;
		this.nftId = nftId;
		this.mintStatus = mintStatus != null ? mintStatus : MintStatus.NONE;
		this.mintHash = mintHash;
		this.storageType = storageType;
	}
}
