package com.zzik.backend.domain.nft.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.memory.entity.Memory;
import com.zzik.backend.domain.memory.repository.MemoryRepository;
import com.zzik.backend.domain.nft.service.MemoryNftService;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/memory/nft")
public class MemoryNftController {

	private final MemoryNftService memoryNftService;
	private final MemberRepository memberRepository;
	private final MemoryRepository memoryRepository;

	@PostMapping("/{tripId}")
	public ResponseEntity<?> mint(
		@PathVariable Long tripId) {

		Long memberId = SecurityUtil.getCurrentMemberId();

		Map<String, Object> result = memoryNftService.mintMemoryAsNft(tripId, memberId);

		return ResponseEntity.ok(result);
	}

	@GetMapping("/{tripId}")
	public ResponseEntity<?> getNftInfo(@PathVariable Long tripId) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		Map<String, Object> result = memoryNftService.getNftInfo(tripId, memberId);
		return ResponseEntity.ok(result);
	}

	@GetMapping("/{tripId}/ownership")
	public ResponseEntity<?> getOwnershipInfo(@PathVariable Long tripId) {
		Long memberId = SecurityUtil.getCurrentMemberId();
		Map<String, Object> result = memoryNftService.getOwnershipInfo(tripId, memberId);
		return ResponseEntity.ok(result);
	}

}
