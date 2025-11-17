package com.zzik.backend.domain.cost.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.cost.entity.NetworkDetailStatus;
import com.zzik.backend.domain.cost.entity.Settlement;
import com.zzik.backend.domain.cost.entity.SettlementMemberTransfer;
import com.zzik.backend.domain.cost.entity.SettlementStatus;
import com.zzik.backend.domain.cost.entity.SettlementTransaction;
import com.zzik.backend.domain.cost.repository.SettlementMemberTransferRepository;
import com.zzik.backend.domain.cost.repository.SettlementRepository;
import com.zzik.backend.domain.cost.repository.SettlementTransactionRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.domain.plan.service.TripMemberService;
import com.zzik.backend.global.external.bank.BankApiClient;
import com.zzik.backend.global.external.bank.BankApiType;
import com.zzik.backend.global.external.bank.config.BankApiConfig;
import com.zzik.backend.global.external.bank.dto.BankHeaderDto;
import com.zzik.backend.global.external.bank.dto.BankTransferRequest;
import com.zzik.backend.global.external.bank.exception.BankApiException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CostSettlementService {

	private final TripMemberService tripMemberService;
	private final CostCalculateService costCalculateService;
	private final BankApiClient bankApiClient;
	private final BankApiConfig bankApiConfig;
	private final SettlementRepository settlementRepository;
	private final SettlementTransactionRepository settlementTransactionRepository;
	private final SettlementMemberTransferRepository settlementMemberTransferRepository;
	private final TripRepository tripRepository;

	@Transactional
	public void processSettlement(Long tripId, Long memberId) {
		log.debug("========================================");
		log.debug("정산 처리 시작 - tripId: {}, memberId: {}", tripId, memberId);
		log.debug("========================================");

		// ============================================================
		// 0. 여행에 속해있는 모든 멤버 확인 및 검증
		// ============================================================
		log.debug("[단계 0] 여행 멤버 조회 및 검증 시작");
		List<TripMember> tripMembers = tripMemberService.validateMembershipAndGetAll(memberId, tripId);
		log.debug("[단계 0] 여행 멤버 조회 완료 - 총 {}명", tripMembers.size());

		// ============================================================
		// 1. Redis에서 빠져있는 멤버들의 정산 계산 수행
		//    - 정산 시작 시점에 모든 멤버의 계산 결과가 Redis에 있어야 함
		// ============================================================
		log.debug("[단계 1] Redis 정산 데이터 확인 및 계산 시작");
		List<TripMember> tripMembersToCalculate = new ArrayList<>();
		tripMembers.forEach(tm -> {
			boolean hasCalculation = costCalculateService.hasCalculateOfTripAndMember(tm.getMember().getId(), tripId);
			log.debug("[단계 1] 멤버 {} (ID: {}) Redis 정산 데이터 존재 여부: {}",
				tm.getMember().getName(), tm.getMember().getId(), hasCalculation);
			if (!hasCalculation) {
				tripMembersToCalculate.add(tm);
			}
		});

		log.debug("[단계 1] 정산 계산이 필요한 멤버: {}명", tripMembersToCalculate.size());
		for (var tm : tripMembersToCalculate) {
			log.debug("[단계 1] 멤버 {} (ID: {}) 정산 계산 수행", tm.getMember().getName(), tm.getMember().getId());
			costCalculateService.calculate(tripId, tm.getMember().getId());
		}
		log.debug("[단계 1] Redis 정산 데이터 준비 완료");

		// ============================================================
		// 2. Settlement 엔티티 생성 (여행별 정산 상태 관리)
		//    - 정산이 시작되면 IN_PROGRESSING 상태로 로우 생성
		// ============================================================
		log.debug("[단계 2] Settlement 엔티티 생성 시작");
		Settlement settlement = Settlement.builder()
			.tripId(tripId)
			.costVersion((short)1)
			.status(SettlementStatus.IN_PROGRESSING)
			.failCount(0)
			.nextRetryAt(null)
			.retryCount(0)
			.build();
		settlementRepository.save(settlement);
		log.debug("[단계 2] Settlement 생성 완료 - ID: {}, 상태: {}", settlement.getId(), settlement.getStatus());

		// ============================================================
		// 3. SettlementMemberTransfer 생성 (회원별 송금 요약 - Redis 스냅샷)
		//    - 각 멤버가 보낼/받을 총액 및 상세 내역을 Redis에서 가져와 DB에 저장
		//    - 사용자 API에서 "내가 누구에게 얼마를 보내야/받아야 하는지" 조회용
		// ============================================================
		log.debug("[단계 3] SettlementMemberTransfer 생성 시작 (Redis 스냅샷)");
		Map<Long, Map<Long, Long>> memberSendDetailsMap = new HashMap<>();  // memberId -> sendMap (receiverId -> amount)
		Map<Long, Map<Long, Long>> memberReceiveDetailsMap = new HashMap<>();  // memberId -> receiveMap (senderId -> amount)
		Map<Long, Long> memberSendTotalMap = new HashMap<>();  // memberId -> 보낼 총액
		Map<Long, Long> memberReceiveTotalMap = new HashMap<>();  // memberId -> 받을 총액

		// 3-1. 각 멤버의 sendMap을 Redis에서 가져와 저장
		log.debug("[단계 3-1] Redis에서 각 멤버의 sendMap 조회 시작");
		for (TripMember tripMember : tripMembers) {
			Long currentMemberId = tripMember.getMember().getId();
			Map<Long, Long> sendMap = costCalculateService.getSendMapFromRedis(tripId, currentMemberId);
			memberSendDetailsMap.put(currentMemberId, sendMap);

			// 현재 멤버가 보낼 총액 계산
			Long sendTotal = sendMap.values().stream().mapToLong(Long::longValue).sum();
			memberSendTotalMap.put(currentMemberId, sendTotal);

			log.debug("[단계 3-1] 멤버 {} (ID: {}) - 보낼 총액: {}원, 송금 상세: {}",
				tripMember.getMember().getName(), currentMemberId, sendTotal, sendMap);

			// 다른 멤버들의 receiveMap에 현재 멤버가 보내는 금액 추가
			sendMap.forEach((receiverId, amount) -> {
				memberReceiveDetailsMap
					.computeIfAbsent(receiverId, k -> new HashMap<>())
					.put(currentMemberId, amount);
				memberReceiveTotalMap.merge(receiverId, amount, Long::sum);
			});
		}
		log.debug("[단계 3-1] Redis sendMap 조회 완료");

		// 3-2. SettlementMemberTransfer 엔티티 생성 및 저장
		log.debug("[단계 3-2] SettlementMemberTransfer 엔티티 생성 및 저장 시작");
		Map<Long, SettlementMemberTransfer> memberTransferMap = new HashMap<>();  // memberId -> transfer
		for (TripMember tripMember : tripMembers) {
			Long currentMemberId = tripMember.getMember().getId();
			Map<Long, Long> sendDetails = memberSendDetailsMap.getOrDefault(currentMemberId, new HashMap<>());
			Map<Long, Long> receiveDetails = memberReceiveDetailsMap.getOrDefault(currentMemberId, new HashMap<>());
			Long sendAmount = memberSendTotalMap.getOrDefault(currentMemberId, 0L);
			Long receiveAmount = memberReceiveTotalMap.getOrDefault(currentMemberId, 0L);
			Long netAmount = receiveAmount - sendAmount;

			log.debug("[단계 3-2] 멤버 {} (ID: {}) - 보낼금액: {}원, 받을금액: {}원, 순액: {}원",
				tripMember.getMember().getName(), currentMemberId, sendAmount, receiveAmount, netAmount);

			SettlementMemberTransfer memberTransfer = SettlementMemberTransfer.builder()
				.settlement(settlement)
				.memberId(currentMemberId)
				.sendAmount(sendAmount)
				.receiveAmount(receiveAmount)
				.netAmount(netAmount)
				.sendDetails(sendDetails.isEmpty() ? null : sendDetails)  // JSONB 스냅샷
				.receiveDetails(receiveDetails.isEmpty() ? null : receiveDetails)  // JSONB 스냅샷
				.sendStatus(sendAmount > 0 ? NetworkDetailStatus.PENDING : null)
				.sendErrorCode(null)
				.receiveStatus(receiveAmount > 0 ? NetworkDetailStatus.PENDING : null)
				.receiveErrorCode(null)
				.build();
			settlementMemberTransferRepository.save(memberTransfer);
			memberTransferMap.put(currentMemberId, memberTransfer);
		}
		log.debug("[단계 3-2] SettlementMemberTransfer 저장 완료 - 총 {}건", memberTransferMap.size());

		// ============================================================
		// 4. 실제 송금 수행 (Phase 1: 송금자 → 서비스 계좌)
		//    - 각 송금자가 보내야 할 총액을 서비스 계좌로 이체
		//    - 예: A→B 3원, A→C 5원 => A→서비스계좌 8원 (1회 이체)
		//    - Transaction 생성: A→서비스 8원 (is_to_service=true)
		// ============================================================
		log.debug("[단계 4] Phase 1 시작: 송금자 → 서비스 계좌");
		Map<Long, SettlementTransaction> senderTransactionMap = new HashMap<>();  // senderId -> transaction
		int phase1Count = 0;

		for (TripMember tripMember : tripMembers) {
			Long senderId = tripMember.getMember().getId();
			Long sendAmount = memberSendTotalMap.getOrDefault(senderId, 0L);

			if (sendAmount <= 0) {
				log.debug("[단계 4] 멤버 {} (ID: {}) - 송금할 금액 없음, 스킵",
					tripMember.getMember().getName(), senderId);
				continue;
			}

			// 송금자 정보 조회
			Member sender = tripMember.getMember();
			log.debug("[단계 4] 멤버 {} (ID: {}) → 서비스 계좌 {}원 이체 시작",
				sender.getName(), senderId, sendAmount);

			// Transaction 생성 (송금자 → 서비스)
			SettlementTransaction toServiceTransaction = SettlementTransaction.builder()
				.settlement(settlement)
				.targetMemberId(senderId)  // 송금하는 사람
				.amount(sendAmount)  // 보낼 총액
				.isToService(true)  // 서비스 계좌로 보내는 송금
				.status(NetworkDetailStatus.PENDING)
				.retryCount(0)
				.build();
			settlementTransactionRepository.save(toServiceTransaction);
			senderTransactionMap.put(senderId, toServiceTransaction);

			// 실제 이체 수행 (송금자 → 서비스 계좌)
			try {
				transferToService(sender, sendAmount);
				phase1Count++;

				// 성공 시 Transaction 상태를 COMPLETED로 변경
				toServiceTransaction.updateStatus(NetworkDetailStatus.COMPLETED);
				log.debug("[단계 4] 멤버 {} (ID: {}) → 서비스 계좌 이체 성공", sender.getName(), senderId);

				// SettlementMemberTransfer의 송금 상태를 TRANSFERRING으로 변경
				// (아직 수신자들에게 이체 완료되지 않았으므로 진행 중)
				SettlementMemberTransfer memberTransfer = memberTransferMap.get(senderId);
				if (memberTransfer != null) {
					memberTransfer.updateSendStatus(NetworkDetailStatus.TRANSFERRING);
				}
			} catch (BankApiException e) {
				// 실패 시 Transaction 상태를 FAILED로 변경
				toServiceTransaction.updateStatus(NetworkDetailStatus.FAILED);
				toServiceTransaction.updateErrorCode(e.getErrorCode().getCode());

				log.error("[단계 4] 멤버 {} (ID: {}) → 서비스 계좌 이체 실패 - 에러코드: {}, 메시지: {}",
					sender.getName(), senderId, e.getErrorCode().getCode(), e.getMessage());

				// SettlementMemberTransfer의 송금 상태를 FAILED로 변경하고 에러 코드 설정
				SettlementMemberTransfer memberTransfer = memberTransferMap.get(senderId);
				if (memberTransfer != null) {
					memberTransfer.updateSendStatus(NetworkDetailStatus.FAILED);
					memberTransfer.updateSendErrorCode(e.getErrorCode().getCode());
				}

				// Settlement 실패 카운트 증가
				settlement.incrementFailCount();
				log.error("송금자 {}의 서비스 계좌 이체 실패: {}", senderId, e.getMessage());
			}

		}
		log.debug("[단계 4] Phase 1 완료 - 성공: {}건", phase1Count);

		// Phase 1과 Phase 2 사이 지연 (금융 API 시간 구분용)
		try {
			Thread.sleep(2000); // 2초 대기
			log.debug("[지연] Phase 1과 Phase 2 사이 2초 대기 완료");
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("[지연] Phase 대기 중 인터럽트 발생: {}", e.getMessage());
		}

		// ============================================================
		// 5. 실제 송금 수행 (Phase 2: 서비스 계좌 → 수신자)
		//    - 서비스 계좌에서 각 수신자에게 받을 금액 이체
		//    - Transaction 생성: 서비스→B 3원, 서비스→C 5원 (is_to_service=false)
		// ============================================================
		log.debug("[단계 5] Phase 2 시작: 서비스 계좌 → 수신자");
		int phase2Count = 0;

		for (TripMember tripMember : tripMembers) {
			Long receiverId = tripMember.getMember().getId();
			Map<Long, Long> receiveDetails = memberReceiveDetailsMap.get(receiverId);

			if (receiveDetails == null || receiveDetails.isEmpty()) {
				log.debug("[단계 5] 멤버 {} (ID: {}) - 받을 금액 없음, 스킵",
					tripMember.getMember().getName(), receiverId);
				continue;
			}

			// 수신자 정보 조회
			Member receiver = tripMember.getMember();
			log.debug("[단계 5] 멤버 {} (ID: {}) - 서비스 계좌로부터 수신 시작, 거래 수: {}",
				receiver.getName(), receiverId, receiveDetails.size());

			// 수신자의 모든 거래가 성공했는지 추적
			boolean allSuccess = true;
			String firstErrorCode = null;

			// 각 송금자로부터 받을 금액별로 Transaction 생성
			for (Map.Entry<Long, Long> entry : receiveDetails.entrySet()) {
				Long fromSenderId = entry.getKey();
				Long amount = entry.getValue();

				log.debug("[단계 5] 서비스 계좌 → 멤버 {} (ID: {}) {}원 이체 시작 (원 송금자 ID: {})",
					receiver.getName(), receiverId, amount, fromSenderId);

				// Transaction 생성 (서비스 → 수신자)
				SettlementTransaction fromServiceTransaction = SettlementTransaction.builder()
					.settlement(settlement)
					.targetMemberId(receiverId)  // 받는 사람
					.amount(amount)
					.isToService(false)  // 서비스 계좌에서 나가는 송금
					.status(NetworkDetailStatus.PENDING)
					.retryCount(0)
					.build();
				settlementTransactionRepository.save(fromServiceTransaction);

				// 실제 이체 수행 (서비스 계좌 → 수신자)
				try {
					transferFromService(receiver, amount);
					phase2Count++;

					// 성공 시 Transaction 상태를 COMPLETED로 변경
					fromServiceTransaction.updateStatus(NetworkDetailStatus.COMPLETED);
					log.debug("[단계 5] 서비스 계좌 → 멤버 {} (ID: {}) 이체 성공", receiver.getName(), receiverId);
				} catch (BankApiException e) {
					// 실패 시 Transaction 상태를 FAILED로 변경
					fromServiceTransaction.updateStatus(NetworkDetailStatus.FAILED);
					fromServiceTransaction.updateErrorCode(e.getErrorCode().getCode());

					log.error("[단계 5] 서비스 계좌 → 멤버 {} (ID: {}) 이체 실패 - 에러코드: {}, 메시지: {}",
						receiver.getName(), receiverId, e.getErrorCode().getCode(), e.getMessage());

					// 첫 번째 에러 코드만 저장
					if (firstErrorCode == null) {
						firstErrorCode = e.getErrorCode().getCode();
					}

					// Settlement 실패 카운트 증가
					settlement.incrementFailCount();
					allSuccess = false;
					log.error("수신자 {}로의 서비스 계좌 이체 실패 (from: {}): {}",
						receiverId, fromSenderId, e.getMessage());
				}
			}

			// 수신자의 모든 Transaction 상태 확인 후 SettlementMemberTransfer 업데이트
			SettlementMemberTransfer memberTransfer = memberTransferMap.get(receiverId);
			if (memberTransfer != null) {
				if (allSuccess) {
					// 모든 거래가 성공하면 COMPLETED
					memberTransfer.updateReceiveStatus(NetworkDetailStatus.COMPLETED);
					log.debug("[단계 5] 멤버 {} (ID: {}) - 모든 수신 거래 성공", receiver.getName(), receiverId);
				} else {
					// 하나라도 실패하면 FAILED
					memberTransfer.updateReceiveStatus(NetworkDetailStatus.FAILED);
					memberTransfer.updateReceiveErrorCode(firstErrorCode);
					log.debug("[단계 5] 멤버 {} (ID: {}) - 일부 수신 거래 실패", receiver.getName(), receiverId);
				}
			}

		}
		log.debug("[단계 5] Phase 2 완료 - 성공: {}건", phase2Count);

		// ============================================================
		// 6. 송금자들의 최종 상태 업데이트
		//    - Phase 2가 모두 완료되었으므로 TRANSFERRING → COMPLETED 변경
		// ============================================================
		log.debug("[단계 6] 송금자들의 최종 상태 업데이트 시작");
		int completedCount = 0;
		for (SettlementMemberTransfer memberTransfer : memberTransferMap.values()) {
			// TRANSFERRING 상태인 송금자들을 COMPLETED로 변경
			// (FAILED는 이미 Phase 1에서 처리됨)
			if (memberTransfer.getSendStatus() == NetworkDetailStatus.TRANSFERRING) {
				memberTransfer.updateSendStatus(NetworkDetailStatus.COMPLETED);
				completedCount++;
				log.debug("[단계 6] 멤버 ID: {} - 송금 상태 COMPLETED로 변경", memberTransfer.getMemberId());
			}
		}
		log.debug("[단계 6] 송금자 상태 업데이트 완료 - {}건", completedCount);

		// ============================================================
		// 7. 정산 완료 상태 업데이트 및 여행 정산 완료 플래그 설정
		// ============================================================
		log.debug("[단계 7] 정산 완료 상태 업데이트 시작");
		if (settlement.getFailCount() == 0) {
			settlement.updateStatus(SettlementStatus.COMPLETE);
			log.debug("[단계 7] 모든 거래 성공 - 정산 상태: COMPLETE");

			// 정산 성공 시 Trip 엔티티의 isCostCompleted를 true로 설정
			Trip trip = tripRepository.findById(tripId)
				.orElseThrow(() -> new IllegalStateException("Trip not found: " + tripId));
			trip.completeCostSettlement();
			log.debug("[단계 7] 여행 정산 완료 플래그 설정 완료 - tripId: {}", tripId);
		} else {
			settlement.updateStatus(SettlementStatus.FAILED);
			log.debug("[단계 7] 일부 거래 실패 - 정산 상태: FAILED, 실패 카운트: {}", settlement.getFailCount());
		}

		log.info("========================================");
		log.info("정산 처리 완료 - tripId: {}, status: {}, failCount: {}",
			tripId, settlement.getStatus(), settlement.getFailCount());
		log.info("========================================");
	}

	/**
	 * 회원 계좌에서 서비스 계좌로 이체
	 * @param sender 송금자 (출금 계좌)
	 * @param amount 이체 금액
	 * @throws BankApiException 이체 실패 시 (잔액 부족, 계좌 오류 등)
	 */
	private void transferToService(Member sender, Long amount) {
		BankTransferRequest request = BankTransferRequest.builder()
			.header(BankHeaderDto.of(BankApiType.TRANSFER))
			.depositAccountNo(BankApiType.getAccount().getNumber())  // 서비스 계좌 (입금받는 곳)
			.withdrawalAccountNo(sender.getAccountNum())             // 회원 계좌 (출금하는 곳)
			.transactionBalance(amount)
			.depositTransactionSummary(BankApiType.getTransferSummary().getDeposit())       // "여행 정산"
			.withdrawalTransactionSummary(BankApiType.getTransferSummary().getWithdrawal()) // "여행 정산"
			.build();

		// 외부 API 호출 - 실패 시 BankApiException 발생
		bankApiClient.transfer(request);
	}

	/**
	 * 서비스 계좌에서 회원 계좌로 이체
	 * @param receiver 수신자 (입금 계좌)
	 * @param amount 이체 금액
	 * @throws BankApiException 이체 실패 시
	 */
	private void transferFromService(Member receiver, Long amount) {
		BankTransferRequest request = BankTransferRequest.builder()
			.header(BankHeaderDto.of(BankApiType.TRANSFER))
			.depositAccountNo(receiver.getAccountNum())              // 회원 계좌 (입금받는 곳)
			.withdrawalAccountNo(BankApiType.getAccount().getNumber())  // 서비스 계좌 (출금하는 곳)
			.transactionBalance(amount)
			.depositTransactionSummary(BankApiType.getTransferSummary().getDeposit())       // "여행 정산"
			.withdrawalTransactionSummary(BankApiType.getTransferSummary().getWithdrawal()) // "여행 정산"
			.build();

		// 외부 API 호출 - 실패 시 BankApiException 발생
		bankApiClient.transfer(request);
	}
}
