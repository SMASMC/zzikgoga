package com.zzik.backend.global.config.data;

import java.time.LocalDate;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.enums.Gender;
import com.zzik.backend.domain.auth.enums.Provider;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.repository.CostMenuRepository;
import com.zzik.backend.domain.cost.repository.CostRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 로컬 환경에서 최종 정산 테스트를 위한 데이터 로더
 *
 * 생성되는 데이터:
 * - Member 3명 (a, b, c)
 * - Trip 1개 (제주도 여행)
 * - TripMember 3개 (b, c는 정산 수락 완료, a는 미수락)
 * - Cost 3개 + CostMenu 3개
 * - 정산 계산 결과: a→b 4000원, c→a 2000원, c→b 5000원
 */
@Slf4j
//@Component
@Profile("local")
@RequiredArgsConstructor
public class TestDataLoader implements CommandLineRunner {

	private final MemberRepository memberRepository;
	private final TripRepository tripRepository;
	private final TripMemberRepository tripMemberRepository;
	private final CostRepository costRepository;
	private final CostMenuRepository costMenuRepository;

	@Override
	@Transactional
	public void run(String... args) throws Exception {
		// 이미 데이터가 있으면 스킵
		if (memberRepository.findByEmail("a@test.com").isPresent()) {
			log.info("테스트 데이터가 이미 존재합니다. 데이터 로딩을 스킵합니다.");
			return;
		}

		log.info("========================================");
		log.info("최종 정산 테스트 데이터 생성 시작");
		log.info("========================================");

		// 1. 테스트 멤버 3명 생성 (금융 API 계좌 정보 사용)
		Member memberA = Member.builder()
			.email("a@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_a")
			.name("a")
			.gender(Gender.MALE)
			.birthYear((short)1990)
			.bankCode("002")
			.accountNum("0021472290024797")
			.thumbnailUrl("http://example.com/a.jpg")
			.build();

		Member memberB = Member.builder()
			.email("b@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_b")
			.name("b")
			.gender(Gender.FEMALE)
			.birthYear((short)1992)
			.bankCode("003")
			.accountNum("0037474064113153")
			.thumbnailUrl("http://example.com/b.jpg")
			.build();

		Member memberC = Member.builder()
			.email("c@test.com")
			.provider(Provider.KAKAO)
			.providerId("kakao_c")
			.name("c")
			.gender(Gender.MALE)
			.birthYear((short)1995)
			.bankCode("004")
			.accountNum("0045754922358584")
			.thumbnailUrl("http://example.com/c.jpg")
			.build();

		memberRepository.saveAll(List.of(memberA, memberB, memberC));

		log.info("✓ 멤버 3명 생성 완료");
		log.info("  - a (ID: {}, 계좌: {}-{})", memberA.getId(), memberA.getBankCode(), memberA.getAccountNum());
		log.info("  - b (ID: {}, 계좌: {}-{})", memberB.getId(), memberB.getBankCode(), memberB.getAccountNum());
		log.info("  - c (ID: {}, 계좌: {}-{})", memberC.getId(), memberC.getBankCode(), memberC.getAccountNum());

		// 2. 테스트 여행 생성
		Trip trip = Trip.builder()
			.owner(memberA)
			.title("제주도 여행")
			.startDate(LocalDate.of(2025, 1, 1))
			.endDate(LocalDate.of(2025, 1, 5))
			.maleCount((short)2)
			.femaleCount((short)1)
			.isCostCompleted(false)
			.build();

		tripRepository.save(trip);

		log.info("✓ 여행 생성 완료");
		log.info("  - {} (ID: {})", trip.getTitle(), trip.getId());

		// 3. TripMember 생성 (b, c는 정산 수락 완료, a는 미수락)
		TripMember tripMemberA = TripMember.builder()
			.trip(trip)
			.member(memberA)
			.isCostAccepted(false)  // a는 아직 수락 안 함
			.build();

		TripMember tripMemberB = TripMember.builder()
			.trip(trip)
			.member(memberB)
			.isCostAccepted(true)   // b는 수락 완료
			.build();

		TripMember tripMemberC = TripMember.builder()
			.trip(trip)
			.member(memberC)
			.isCostAccepted(true)   // c는 수락 완료
			.build();

		tripMemberRepository.saveAll(List.of(tripMemberA, tripMemberB, tripMemberC));

		log.info("✓ TripMember 생성 완료");
		log.info("  - a: 정산 수락 미완료");
		log.info("  - b: 정산 수락 완료");
		log.info("  - c: 정산 수락 완료");

		// 4. Cost 및 CostMenu 생성
		// 목표: a→b 4000원, c→a 2000원, c→b 5000원

		// Cost 1: b가 결제한 12000원 (a, b, c가 나눠냄 => 각 4000원)
		Cost cost1 = Cost.builder()
			.trip(trip)
			.createdBy(memberB)
			.payer(memberB)  // b가 먼저 결제
			.paidAt("2025-01-02T12:00:00")
			.place("제주 맛집")
			.totalAmount(12000L)
			.memo("점심 식사")
			.build();
		costRepository.save(cost1);

		CostMenu costMenu1 = CostMenu.builder()
			.cost(cost1)
			.menuName("메뉴1")
			.count(1)
			.amount(12000L)
			.mustPayerIds(List.of(memberA.getId(), memberB.getId(), memberC.getId()))
			.build();
		costMenuRepository.save(costMenu1);

		log.info("✓ Cost 1 생성: b가 12000원 결제, [a,b,c] 참여 => a→b: 4000원, c→b: 4000원");

		// Cost 2: a가 결제한 4000원 (a, c가 나눠냄 => 각 2000원)
		Cost cost2 = Cost.builder()
			.trip(trip)
			.createdBy(memberA)
			.payer(memberA)  // a가 먼저 결제
			.paidAt("2025-01-03T18:00:00")
			.place("제주 카페")
			.totalAmount(4000L)
			.memo("커피")
			.build();
		costRepository.save(cost2);

		CostMenu costMenu2 = CostMenu.builder()
			.cost(cost2)
			.menuName("메뉴2")
			.count(1)
			.amount(4000L)
			.mustPayerIds(List.of(memberA.getId(), memberC.getId()))
			.build();
		costMenuRepository.save(costMenu2);

		log.info("✓ Cost 2 생성: a가 4000원 결제, [a,c] 참여 => c→a: 2000원");

		// Cost 3: b가 결제한 2000원 (b, c가 나눠냄 => 각 1000원)
		Cost cost3 = Cost.builder()
			.trip(trip)
			.createdBy(memberB)
			.payer(memberB)  // b가 먼저 결제
			.paidAt("2025-01-04T20:00:00")
			.place("제주 편의점")
			.totalAmount(2000L)
			.memo("간식")
			.build();
		costRepository.save(cost3);

		CostMenu costMenu3 = CostMenu.builder()
			.cost(cost3)
			.menuName("메뉴3")
			.count(1)
			.amount(2000L)
			.mustPayerIds(List.of(memberB.getId(), memberC.getId()))
			.build();
		costMenuRepository.save(costMenu3);

		log.info("✓ Cost 3 생성: b가 2000원 결제, [b,c] 참여 => c→b: 1000원");

		log.info("========================================");
		log.info("테스트 데이터 생성 완료!");
		log.info("========================================");
		log.info("정산 계산 결과:");
		log.info("  - a → b: 4,000원");
		log.info("  - c → a: 2,000원");
		log.info("  - c → b: 5,000원 (4,000 + 1,000)");
		log.info("========================================");
		log.info("다음 단계:");
		log.info("1. member a로 로그인 (email: a@test.com)");
		log.info("2. GET /api/trips/{}/cost/calculate API 호출하여 정산 계산", trip.getId());
		log.info("3. POST /api/trips/{}/cost/approval API 호출하여 정산 수락", trip.getId());
		log.info("4. 최종 정산이 실행되고 실제 송금이 이루어집니다.");
		log.info("========================================");
	}
}
