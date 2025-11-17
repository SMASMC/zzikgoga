package com.zzik.backend.domain.cost.integration;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.enums.Gender;
import com.zzik.backend.domain.auth.enums.Provider;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.entity.Settlement;
import com.zzik.backend.domain.cost.entity.SettlementMemberTransfer;
import com.zzik.backend.domain.cost.entity.SettlementStatus;
import com.zzik.backend.domain.cost.repository.SettlementMemberTransferRepository;
import com.zzik.backend.domain.cost.repository.SettlementRepository;
import com.zzik.backend.domain.cost.service.CostCalculateService;
import com.zzik.backend.domain.cost.service.CostSettlementService;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.external.bank.BankApiClient;
import com.zzik.backend.global.external.bank.dto.BankTransferResponse;

/**
 * 최종 정산 통합 테스트
 * - 모든 멤버가 정산을 수락했을 때 실제 송금 로직이 실행되는지 검증
 * - BankApiClient는 모킹하여 실제 API 호출 없이 테스트
 */
@Disabled("CI/CD 환경에서 실행 비활성화")
@SpringBootTest
@Transactional
@ActiveProfiles("local")
@org.springframework.test.context.TestPropertySource(properties = {
	"CLOVA_OCR_INVOKE_URL=http://test-clova-ocr-url",
	"CLOVA_OCR_SECRET_KEY=test-clova-ocr-secret-key",
	"KAKAO_CLIENT_ID=test-kakao-client-id",
	"S3_BUCKET_NAME=test-bucket",
	"S3_REGION=ap-northeast-2",
	"S3_ACCESS_KEY=test-access-key",
	"S3_SECRET_ACCESS_KEY=test-secret-key",
	"FINANCE_URL_BASE=http://test-bank-api-url",
	"FINANCE_CREDENTIALS_APP_KEY=test-app-key",
	"FINANCE_CREDENTIALS_USER_KEY=test-user-key",
	"FINANCE_ACCOUNT_NUMBER=test-account-number",
	"FINANCE_ACCOUNT_BANK_NUMBER=test-bank-number"
})
@DisplayName("최종 정산 통합 테스트")
public class FinalSettlementIntegrationTest {

	@Autowired
	private MemberRepository memberRepository;

	@Autowired
	private TripRepository tripRepository;

	@Autowired
	private TripMemberRepository tripMemberRepository;

	@Autowired
	private SettlementRepository settlementRepository;

	@Autowired
	private SettlementMemberTransferRepository settlementMemberTransferRepository;

	@Autowired
	private CostSettlementService costSettlementService;

	@MockBean
	private CostCalculateService costCalculateService;

	@MockBean
	private BankApiClient bankApiClient;

	private Member member1;
	private Member member2;
	private Member member3;
	private Trip trip;

	@BeforeEach
	void setUp() {
		// 1. 테스트 멤버 3명 생성
		member1 = Member.builder()
			.email("member1@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_member1")
			.name("멤버1")
			.gender(Gender.MALE)
			.birthYear((short)1990)
			.bankCode("001")
			.accountNum("1234567890")
			.thumbnailUrl("http://example.com/thumb1.jpg")
			.build();

		member2 = Member.builder()
			.email("member2@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_member2")
			.name("멤버2")
			.gender(Gender.FEMALE)
			.birthYear((short)1992)
			.bankCode("002")
			.accountNum("2345678901")
			.thumbnailUrl("http://example.com/thumb2.jpg")
			.build();

		member3 = Member.builder()
			.email("member3@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_member3")
			.name("멤버3")
			.gender(Gender.MALE)
			.birthYear((short)1995)
			.bankCode("003")
			.accountNum("3456789012")
			.thumbnailUrl("http://example.com/thumb3.jpg")
			.build();

		memberRepository.saveAll(List.of(member1, member2, member3));

		// 2. 테스트 여행 생성
		trip = Trip.builder()
			.owner(member1)
			.title("제주도 여행")
			.startDate(LocalDate.of(2025, 1, 1))
			.endDate(LocalDate.of(2025, 1, 5))
			.maleCount((short)2)
			.femaleCount((short)1)
			.isCostCompleted(false)
			.build();

		tripRepository.save(trip);

		// 3. TripMember 생성 (3명 모두 여행 참여)
		TripMember tripMember1 = TripMember.builder()
			.trip(trip)
			.member(member1)
			.isCostAccepted(true)  // 이미 수락
			.build();

		TripMember tripMember2 = TripMember.builder()
			.trip(trip)
			.member(member2)
			.isCostAccepted(true)  // 이미 수락
			.build();

		TripMember tripMember3 = TripMember.builder()
			.trip(trip)
			.member(member3)
			.isCostAccepted(true)  // 마지막 수락 (이 시점에서 정산 시작)
			.build();

		tripMemberRepository.saveAll(List.of(tripMember1, tripMember2, tripMember3));

		// 4. Redis 정산 데이터 모킹
		// member1: member2에게 10000원, member3에게 5000원 송금 (총 15000원 보냄)
		// member2: member1로부터 10000원 받음
		// member3: member1로부터 5000원 받음
		Map<Long, Long> member1SendMap = new HashMap<>();
		member1SendMap.put(member2.getId(), 10000L);
		member1SendMap.put(member3.getId(), 5000L);

		when(costCalculateService.hasCalculateOfTripAndMember(anyLong(), eq(trip.getId())))
			.thenReturn(true);

		when(costCalculateService.getSendMapFromRedis(eq(trip.getId()), eq(member1.getId())))
			.thenReturn(member1SendMap);

		when(costCalculateService.getSendMapFromRedis(eq(trip.getId()), eq(member2.getId())))
			.thenReturn(new HashMap<>());  // member2는 송금할 금액 없음

		when(costCalculateService.getSendMapFromRedis(eq(trip.getId()), eq(member3.getId())))
			.thenReturn(new HashMap<>());  // member3은 송금할 금액 없음

		// 5. BankApiClient 모킹 (모든 이체 성공)
		BankTransferResponse successResponse = new BankTransferResponse();
		BankTransferResponse.Header header = new BankTransferResponse.Header();
		header.setResponseCode("H0000");
		header.setResponseMessage("정상처리 되었습니다.");
		successResponse.setHeader(header);

		when(bankApiClient.transfer(any())).thenReturn(successResponse);
	}

	@Test
	@DisplayName("모든 멤버가 정산 수락 시 최종 정산이 실행되고 Settlement가 생성된다")
	void testFinalSettlement_Success() throws InterruptedException {
		// Given: 모든 멤버가 정산을 수락한 상태 (setUp에서 준비)

		// When: 정산 처리 실행
		costSettlementService.processSettlement(trip.getId(), member3.getId());

		// 비동기 처리 대기 (필요시)
		Thread.sleep(1000);

		// Then: Settlement가 생성되었는지 확인
		List<Settlement> settlements = settlementRepository.findAll();
		assertThat(settlements).hasSize(1);

		Settlement settlement = settlements.get(0);
		assertThat(settlement.getTripId()).isEqualTo(trip.getId());
		assertThat(settlement.getStatus()).isEqualTo(SettlementStatus.COMPLETE);
		assertThat(settlement.getFailCount()).isEqualTo(0);

		// SettlementMemberTransfer 확인
		List<SettlementMemberTransfer> transfers = settlementMemberTransferRepository.findAll();
		assertThat(transfers).hasSize(3);  // 3명의 멤버

		// member1의 송금 내역 확인
		SettlementMemberTransfer member1Transfer = transfers.stream()
			.filter(t -> t.getMemberId().equals(member1.getId()))
			.findFirst()
			.orElseThrow();

		assertThat(member1Transfer.getSendAmount()).isEqualTo(15000L);
		assertThat(member1Transfer.getReceiveAmount()).isEqualTo(0L);
		assertThat(member1Transfer.getNetAmount()).isEqualTo(-15000L);

		// member2의 수신 내역 확인
		SettlementMemberTransfer member2Transfer = transfers.stream()
			.filter(t -> t.getMemberId().equals(member2.getId()))
			.findFirst()
			.orElseThrow();

		assertThat(member2Transfer.getSendAmount()).isEqualTo(0L);
		assertThat(member2Transfer.getReceiveAmount()).isEqualTo(10000L);
		assertThat(member2Transfer.getNetAmount()).isEqualTo(10000L);

		// member3의 수신 내역 확인
		SettlementMemberTransfer member3Transfer = transfers.stream()
			.filter(t -> t.getMemberId().equals(member3.getId()))
			.findFirst()
			.orElseThrow();

		assertThat(member3Transfer.getSendAmount()).isEqualTo(0L);
		assertThat(member3Transfer.getReceiveAmount()).isEqualTo(5000L);
		assertThat(member3Transfer.getNetAmount()).isEqualTo(5000L);

		// BankApiClient가 호출되었는지 확인
		// 1회: member1 → 서비스 계좌 (15000원)
		// 2회: 서비스 계좌 → member2 (10000원)
		// 3회: 서비스 계좌 → member3 (5000원)
		verify(bankApiClient, times(3)).transfer(any());
	}

	@Test
	@DisplayName("정산 데이터가 올바르게 스냅샷으로 저장된다")
	void testSettlementDataSnapshot() {
		// When
		costSettlementService.processSettlement(trip.getId(), member3.getId());

		// Then
		List<SettlementMemberTransfer> transfers = settlementMemberTransferRepository.findAll();

		SettlementMemberTransfer member1Transfer = transfers.stream()
			.filter(t -> t.getMemberId().equals(member1.getId()))
			.findFirst()
			.orElseThrow();

		// sendDetails와 receiveDetails가 JSONB로 저장되었는지 확인
		assertThat(member1Transfer.getSendDetails()).isNotNull();
		assertThat(member1Transfer.getSendDetails()).containsEntry(member2.getId(), 10000L);
		assertThat(member1Transfer.getSendDetails()).containsEntry(member3.getId(), 5000L);
	}
}