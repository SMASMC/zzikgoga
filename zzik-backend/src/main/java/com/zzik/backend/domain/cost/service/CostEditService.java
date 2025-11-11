package com.zzik.backend.domain.cost.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.dto.request.CostEditRequest;
import com.zzik.backend.domain.cost.dto.response.CostEditResponse;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.repository.CostMenuRepository;
import com.zzik.backend.domain.cost.repository.CostRepository;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.service.TripMemberService;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostEditService {

	private final CostRepository costRepository;
	private final CostMenuRepository costMenuRepository;
	private final MemberRepository memberRepository;
	private final TripMemberRepository tripMemberRepository;
	private final CostEditLockService costEditLockService;
	private final TripMemberService tripMemberService;

	@Transactional
	public CostEditResponse edit(Long tripId, Long costId, CostEditRequest req) {
		final Long requesterId = SecurityUtil.getCurrentMemberId();

		// 1) 기본 검증
		Cost cost = costRepository.findByIdAndTripId(costId, tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND));
		assertTripMember(tripId, requesterId);
		assertTripMember(tripId, req.payerId());
		for (var m : safe(req.menus()))
			for (Long pid : safe(m.payerIds()))
				assertTripMember(tripId, pid);
		if (Boolean.TRUE.equals(cost.getTrip().getIsCostCompleted())) {
			throw BusinessException.from(ExceptionCode.TRIP_COST_ALREADY_COMPLETED);
		}

		// 2) 락 소유 확인
		if (!costEditLockService.isOwnedBy(tripId, costId, requesterId))
			throw BusinessException.from(ExceptionCode.EDIT_LOCK_NOT_FOUND);

		// 3) 부모 필드 업데이트
		Member payer = memberRepository.findById(req.payerId())
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER));
		cost.updateMain(req.paidAt(), req.place(), payer, req.memo());

		// 4) 현재 메뉴 인덱싱
		Map<Long, CostMenu> current = costMenuRepository.findAllByCost_Id(costId).stream()
			.collect(Collectors.toMap(CostMenu::getId, it -> it));

		// 5) upsert (INSERT/UPDATE)
		for (var m : safe(req.menus())) {
			int cnt = m.count();
			List<Long> mustPayerIds = safe(m.payerIds()).stream().distinct().toList();

			if (m.costMenuId() == null) {
				CostMenu created = CostMenu.builder()
					.cost(cost)
					.menuName(m.menuName())
					.count(cnt)
					.amount(m.amount())
					.mustPayerIds(mustPayerIds)
					.build();
				costMenuRepository.save(created);
			} else {
				CostMenu exist = costMenuRepository.findByIdAndCostId(m.costMenuId(), costId)
					.orElseThrow(() -> BusinessException.from(ExceptionCode.COST_MENU_NOT_FOUND));
				exist.apply(m.menuName(), m.amount(), cnt, mustPayerIds);
				current.remove(m.costMenuId());
			}
		}

		// 6) 삭제: current에 남아있는 기존 메뉴 = 요청에서 사라진 메뉴
		if (!current.isEmpty()) {
			cost.getCostMenus().removeIf(cm -> current.containsKey(cm.getId()));
		}

		// 7) 합계 재계산
		cost.recalcTotal();

		// 8) invalidate approvals in case AOP didn't trigger
		try {
			tripMemberService.invalidateAllByTrip(tripId);
		} catch (Exception ignored) {
		}

		// 9) 응답
		return toResponse(cost);
	}

	private void assertTripMember(Long tripId, Long memberId) {
		if (memberId == null || !tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}
	}

	private static <T> List<T> safe(List<T> list) {
		return list == null ? List.of() : list;
	}

	private CostEditResponse toResponse(Cost cost) {
		Map<Long, String> nameMap = cost.getTrip().getTripMembers().stream()
			.collect(Collectors.toMap(tm -> tm.getMember().getId(), tm -> tm.getMember().getName()));

		return CostEditResponse.builder()
			.costId(cost.getId())
			.paidAt(cost.getPaidAt())
			.place(cost.getPlace())
			.payerId(cost.getPayer().getId())
			.payerName(cost.getPayer().getName())
			.totalAmount(cost.getTotalAmount())
			.memo(cost.getMemo())
			.menus(cost.getCostMenus().stream()
				.sorted(Comparator.comparing(CostMenu::getId))
				.map(menu -> CostEditResponse.MenuDto.builder()
					.costMenuId(menu.getId())
					.menuName(menu.getMenuName())
					.amount(menu.getAmount())
					.payers(safe(menu.getMustPayerIds()).stream()
						.distinct()
						.map(pid -> CostEditResponse.MenuDto.PayerDto.builder()
							.memberId(pid)
							.memberName(nameMap.get(pid))
							.build())
						.toList())
					.build())
				.toList())
			.build();
	}
}
