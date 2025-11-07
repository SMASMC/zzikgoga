package com.zzik.backend.domain.cost.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.dto.request.CostEditRequest;
import com.zzik.backend.domain.cost.dto.response.CostEditResponse;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.repository.CostMenuRepository;
import com.zzik.backend.domain.cost.repository.CostRepository;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostEditService {

	private final CostRepository costRepository;
	private final CostMenuRepository costMenuRepository;
	private final MemberRepository memberRepository;
	private final TripMemberRepository tripMemberRepository;
	private final CostEditLockService costEditLockService;

	@Transactional
	public CostEditResponse edit(Long tripId, Long costId, CostEditRequest req) {
		Long requesterId = currentMemberId();

		// 1) 기본 검증
		Cost cost = costRepository.findByIdAndTripId(costId, tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND)); // or COST_NOT_FOUND 분리 시 소속 검증 추가
		assertTripMember(tripId, requesterId);
		assertTripMember(tripId, req.payerId());
		for (var m : safe(req.menus()))
			for (Long pid : safe(m.payerIds()))
				assertTripMember(tripId, pid);
		if (Boolean.TRUE.equals(cost.getTrip().getIsCostCompleted())) {
			throw BusinessException.from(ExceptionCode.TRIP_COST_ALREADY_COMPLETED);
		}

		// // 2) 락 소유 확인
		// if (!costEditLockService.isOwnedBy(costId, requesterId))
		// 	throw BusinessException.from(ExceptionCode.EDIT_LOCK_HELD_BY_OTHERS);

		// // 3) 부모 필드 업데이트
		// Member payer = memberRepository.findById(req.payerId())
		// 	.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER));
		// cost.updateMain(req.paidAt(), req.place(), payer, req.memo());

		// // 4) 현재 메뉴 인덱싱
		// Map<Long, CostMenu> current = costMenuRepository.findAllByCostId(costId).stream()
		// 	.collect(Collectors.toMap(CostMenu::getId, it -> it));
		//
		// // 5) upsert
		// for (var m : safe(req.menus())) {
		// 	if (m.costMenuId() == null) { // INSERT
		// 		CostMenu created = CostMenu.builder()
		// 			.cost(cost)
		// 			.menuName(m.menuName())
		// 			.count(m.count() == null ? 1 : m.count())
		// 			.amount(m.amount())
		// 			.mustPayerIds(distinct(safe(m.payerIds())))
		// 			.build();
		// 		costMenuRepository.save(created);
		// 	} else { // UPDATE
		// 		CostMenu exist = costMenuRepository.findByIdAndCostId(m.costMenuId(), costId)
		// 			.orElseThrow(() -> BusinessException.from(ExceptionCode.COST_MENU_NOT_FOUND));
		// 		exist.apply(
		// 			m.getMenuName(),
		// 			m.getAmount(),
		// 			m.getCount(),
		// 			distinct(safe(m.getPayerIds()))
		// 		);
		// 		current.remove(m.getCostMenuId());
		// 	}
		// }
		//
		// // 6) 삭제
		// Set<Long> deleteIds = new HashSet<>(safe(req.deletedMenuIds()));
		// for (var m : safe(req.menus()))
		// 	if (m.costMenuId() != null)
		// 		deleteIds.remove(m.getCostMenuId());
		// if (!deleteIds.isEmpty()) {
		// 	// 소속 검증
		// 	for (Long id : deleteIds) {
		// 		costMenuRepository.findByIdAndCostId(id, costId)
		// 			.orElseThrow(() -> BusinessException.from(ExceptionCode.COST_MENU_NOT_FOUND));
		// 	}
		// 	costMenuRepository.deleteAllByIdInBatch(deleteIds);
		// }
		//
		// // 7) 합계 재계산
		// cost.recalcTotal();

		// 8) 응답
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

	private static List<Long> distinct(List<Long> ids) {
		return ids.stream().distinct().toList();
	}

	private Long currentMemberId() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		Object principal = auth == null ? null : auth.getPrincipal();
		if (principal == null)
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		// 네 프로젝트의 Principal 타입에 맞게 바꿔라 (예: CustomUserPrincipal#getId()).
		try {
			return (Long)principal.getClass().getMethod("getId").invoke(principal);
		} catch (Exception ignore) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}
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
						.map(pid -> CostEditResponse.PayerDto.builder()
							.memberId(pid)
							.memberName(nameMap.get(pid))
							.build())
						.toList())
					.build())
				.toList())
			.build();
	}
}
