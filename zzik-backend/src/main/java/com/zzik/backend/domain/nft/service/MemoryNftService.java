package com.zzik.backend.domain.nft.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.memory.entity.Memory;
import com.zzik.backend.domain.memory.repository.MemoryRepository;
import com.zzik.backend.domain.nft.dto.JsonUploadResponse;
import com.zzik.backend.domain.nft.dto.PdfUploadResponse;
import com.zzik.backend.global.arweave.ArweaveUploadClient;
import com.zzik.backend.global.arweave.ArweaveUploadClient.ArweaveUploadResponse;
import com.zzik.backend.global.cloud.s3.service.S3Service;
import com.zzik.backend.global.web3.TripMemoryNftClient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemoryNftService {

	private final MemoryRepository memoryRepository;
	private final MemberRepository memberRepository;
	private final ArweaveUploadClient arweaveUploadClient;
	private final S3Service s3Service;
	private final TripMemoryNftClient tripMemoryNftClient;

	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * 여행기록 NFT 민팅
	 * 1) S3에서 PDF 다운로드
	 * 2) Arweave PDF 업로드
	 * 3) metadata.json 생성
	 * 4) metadata.json Arweave 업로드
	 * 5) tokenURI = metadataURL 로 민팅
	 */
	@Transactional
	public Map<String, Object> mintMemoryAsNft(Long tripId, Long memberId) {

		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new IllegalArgumentException("Member not found"));

		Memory memory = memoryRepository.findByTripIdAndMemberId(tripId, memberId)
			.orElseThrow(() -> new IllegalArgumentException("Memory not found"));

		/** 1) PDF 다운로드 */
		String s3PdfKey = s3Service.getPresignedUrl(memory.getPdfUrl());
		byte[] pdfBytes = s3Service.downloadBytes(s3PdfKey);
		String filename = "trip-memory-" + tripId + ".pdf";

		log.info("🔥 STEP 1. Before PDF upload call");
		log.info("🔥 STEP 1-1 PDF upload request = {}", filename);

		/** 2) PDF → Arweave 업로드 */
		PdfUploadResponse pdfUpload = arweaveUploadClient.uploadPdf(pdfBytes, filename);
		String pdfUrl = pdfUpload.pdfUrl();
		String thumbnailUrl = pdfUpload.thumbnailUrl();

		log.info("🔥 STEP 2. Node PDF Upload Response = {}", pdfUrl);

		/** 3) metadata.json 생성 */
		ObjectNode metadata = objectMapper.createObjectNode();
		metadata.put("name", memory.getTitle());
		metadata.put("description", "travel stroy with zzik : " + pdfUrl);
		metadata.put("image", thumbnailUrl);
		metadata.put("pdf_url", pdfUrl);
		metadata.put("external_url", "https://zzik.kr");

		// Attributes
		ArrayNode attrs = metadata.putArray("attributes");
		attrs.add(objectMapper.createObjectNode()
			.put("trait_type", "tripId")
			.put("value", tripId));
		attrs.add(objectMapper.createObjectNode()
			.put("trait_type", "author")
			.put("value", member.getName()));

		/** 4) metadata.json → Arweave 업로드 */
		JsonUploadResponse metaUpload =
			arweaveUploadClient.uploadJson(metadata.toString());
		String metadataUrl = metaUpload.tokenURI();

		/** 5) NFT 민팅 (tokenURI = metadataUrl) */
		tripMemoryNftClient.mintForGroup(
			tripId.toString(),
			List.of(member.getWalletAddress()),
			metadataUrl
		);

		/** 6) DB 상태 갱신 */
		memory.updatePermanentArchive(metadataUrl);
		member.setRemainingArweaveUses((short)(member.getRemainingArweaveUses() - 1));

		return Map.of(
			"message", "NFT mint successful"
		);
	}

	@Transactional(readOnly = true)
	public Map<String, Object> getNftInfo(Long tripId, Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new IllegalArgumentException("Member not found"));
		Memory memory = memoryRepository.findByTripIdAndMemberId(tripId, memberId)
			.orElseThrow(() -> new IllegalArgumentException("Memory not found"));

		String metadataUrl = memory.getArweaveUrl();
		if (metadataUrl == null) {
			throw new IllegalStateException("No metadata (arweaveUrl) found for this memory");
		}

		// 1️⃣ Arweave metadata.json 요청
		WebClient client = WebClient.create();
		String effectiveUrl = metadataUrl;
		if (metadataUrl.contains("gateway.irys.xyz")) {
			effectiveUrl = metadataUrl.replace("gateway.irys.xyz", "uploader.irys.xyz");
		}

		Map<String, Object> metadata = null;
		try {
			metadata = client
				.get()
				.uri(effectiveUrl)
				.retrieve()
				.bodyToMono(Map.class)
				.block();
		} catch (Exception e) {
			log.error("❌ Failed to fetch metadata from {}", effectiveUrl, e);
		}

		if (metadata == null) {
			throw new IllegalStateException("metadata is null or not a valid JSON at " + metadataUrl);
		}

		String pdfUrl = (String) metadata.get("pdf_url");

		return Map.of(
			"tripId", tripId,
			"pdfUrl", pdfUrl,
			"metadataUrl", metadataUrl
		);
	}

	@Transactional(readOnly = true)
	public Map<String, Object> getOwnershipInfo(Long tripId, Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new IllegalArgumentException("Member not found"));
		Memory memory = memoryRepository.findByTripIdAndMemberId(tripId, memberId)
			.orElseThrow(() -> new IllegalArgumentException("Memory not found"));

		String metadataUrl = memory.getArweaveUrl();
		String walletAddress = member.getWalletAddress();

		boolean isOwner = tripMemoryNftClient.checkOwnership(walletAddress, metadataUrl);

		// PolygonScan에서 직접 확인할 수 있는 링크
		String polygonUrl = String.format(
			"https://polygonscan.com/address/%s#tokentxns",
			walletAddress
		);

		String openseaUrl = String.format(
			"https://opensea.io/%s",
			walletAddress
		);

		return Map.of(
			"tripId", tripId,
			"walletAddress", walletAddress,
			"isOwner", isOwner,
			"polygonUrl", polygonUrl,
			"openseaUrl", openseaUrl
		);
	}


}
