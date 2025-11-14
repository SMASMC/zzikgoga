package com.zzik.backend.domain.cost.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.cost.entity.CostSettlement;
import com.zzik.backend.domain.cost.entity.SettlementStatus;
import com.zzik.backend.domain.cost.repository.CostSettlementRepository;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.service.TripMemberService;
import com.zzik.backend.global.external.bank.BankApiClient;
import com.zzik.backend.global.external.bank.BankApiType;
import com.zzik.backend.global.external.bank.config.BankApiConfig;
import com.zzik.backend.global.external.bank.dto.BankHeaderDto;
import com.zzik.backend.global.external.bank.dto.BankTransferRequest;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostSettlementService {

	private final TripMemberService tripMemberService;
	private final CostCalculateService costCalculateService;
	private final CostSettlementRepository costSettlementRepository;
	private final BankApiClient bankApiClient;
	private final BankApiConfig bankApiConfig;

	public void processSettlement(Long tripId, Long memberId) {
		// 0. 여행에 속해있는 모든 멤버 확인
		List<TripMember> tripMembers = tripMemberService.validateMembershipAndGetAll(memberId, tripId);
		// 1. redis에서 빠져있는 것들 확인
		List<TripMember> tripMembersToCalculate = new ArrayList<>();
		tripMembers.forEach(tm -> {
			if (!costCalculateService.hasCalculateOfTripAndMember(tm.getMember().getId(), tripId)) {
				tripMembersToCalculate.add(tm);
			}
		});
		// 2. 빠져있는 것들을 채워주기
		for (var tm : tripMembersToCalculate) {
			costCalculateService.calculate(tm.getMember().getId(), tripId);
		}
		// 3. 모든 플로우들을 토대로 순차적으로 DB트랜잭션 수행
		// 3-1. 여행 별 정산 상태 엔티티 생성
		costSettlementRepository.save(new CostSettlement(
			tripId,
			SettlementStatus.IN_PROGRESSING,
			0,
			null,
			0
		));

		// 3-2. 실제 정산 로직들 수행
		try{
			// 여행 멤버 순회
			for(TripMember tripMember : tripMembers){
				Member sender = tripMember.getMember();
				// 3-2-1. 전송자 별 보내야하는 기록 가져오기
				Map<Long, Long> sendMap = costCalculateService.getSendMapFromRedis(tripId, sender.getId());
				for(Map.Entry<Long, Long> entry: sendMap.entrySet()){
					Long receive_member_id = entry.getKey();
					Long amount = entry.getValue();

					// 3-2-2. 서비스계좌로 이체
					transferToService(sender, amount);

				}
			}

		}
	}

	private void transferToService(Member sender, Long amount) {
		BankTransferRequest request = BankTransferRequest.builder()
			.header(BankHeaderDto.of(BankApiType.TRANSFER))
			.depositAccountNo(BankApiType.getAccount().getNumber())  // 서비스 계좌 (입금받는 곳)
			.withdrawalAccountNo(sender.getAccountNum())             // 회원 계좌 (출금하는 곳)
			.transactionBalance(amount)
			.depositTransactionSummary(BankApiType.getTransferSummary().getDeposit())       // "여행 정산"
			.withdrawalTransactionSummary(BankApiType.getTransferSummary().getWithdrawal()) // "여행 정산"
			.build();
		bankApiClient.transfer(request);
	}
}
