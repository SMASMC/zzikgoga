package com.zzik.backend.domain.memory.entity;

import java.util.Map;

import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.memory.enums.MemoryStatus;
import com.zzik.backend.domain.memory.enums.MintStatus;
import com.zzik.backend.domain.memory.enums.StorageType;
import com.zzik.backend.domain.plan.entity.Trip;
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
import lombok.Setter;

/**
 * 추억 엔티티
 * 여행 추억의 PDF/NFT 등을 관리합니다.
 */
@Entity
@Table(name = "memory")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Memory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member; // FK to member.id

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip; // FK to trip.id

    @Column(name = "title", nullable = false, length = 255)
    private String title; // 추억 제목

    @Column(name = "status", nullable = false, columnDefinition = "memory_status")
    @JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private MemoryStatus status = MemoryStatus.onprocess;

    @Column(name = "content", columnDefinition = "JSONB")
	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Object> content; // 임시저장 콘텐츠(JSON)

    @Column(name = "pdf_url", length = 1024)
    private String pdfUrl; // PDF URL

    @Column(name = "arweave_url", length = 1024)
    private String arweaveUrl; // Arweave URL

	public void updatePermanentArchive(String arweaveUrl) {
		this.arweaveUrl = arweaveUrl;
	}

    @Column(name = "nft_id", length = 255)
    private String nftId; // NFT ID

    @Column(name = "mint_status", nullable = false, columnDefinition = "mint_status")
    @JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private MintStatus mintStatus = MintStatus.none;

    @Column(name = "mint_hash", length = 255)
    private String mintHash; // 트랜잭션 해시

    @Column(name = "storage_type", columnDefinition = "storage_type")
    @JdbcType(org.hibernate.dialect.PostgreSQLEnumJdbcType.class)
    private StorageType storageType; // 저장소 타입(S3/Arweave)

    @Builder
    public Memory(Member member, Trip trip, String title, MemoryStatus status,
		Map<String, Object> content, String pdfUrl, String arweaveUrl, String nftId,
                  MintStatus mintStatus, String mintHash, StorageType storageType) {
        this.member = member;
        this.trip = trip;
        this.title = title;
        this.status = status != null ? status : MemoryStatus.onprocess;
        this.content = content;
        this.pdfUrl = pdfUrl;
        this.arweaveUrl = arweaveUrl;
        this.nftId = nftId;
        this.mintStatus = mintStatus != null ? mintStatus : MintStatus.none;
        this.mintHash = mintHash;
        this.storageType = storageType;
    }

	/**
	 * 여행 기록의 내용(제목, 본문, 상태)을 수정합니다.
	 */
	public void update(String title, Map<String, Object> content, MemoryStatus status) {
		this.title = title;
		this.content = content;
		this.status = status;
	}

	/**
	 * PDF 저장 정보를 업데이트합니다. (S3 Object Key 저장)
	 */
	public void setPdfStorageInfo(String pdfObjectKey, StorageType storageType) {
		this.pdfUrl = pdfObjectKey;
		this.storageType = storageType;
	}
}

