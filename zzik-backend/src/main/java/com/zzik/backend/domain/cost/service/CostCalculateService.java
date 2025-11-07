package com.zzik.backend.domain.cost.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.cost.dto.response.CostCalculateResponse;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.repository.CostRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CostCalculateService {

	private final CostRepository costRepository;
	private final TripRepository tripRepository;

	private final StringRedisTemplate redis;

	private static final String PFX = "settle";
	private static final Duration TTL = Duration.ofDays(3);

	/*
	Redis 관련
	 */
	private String senderKey(long tripId, long senderId) {
		return PFX + ":" + tripId + ":" + senderId;
	}

	private void saveSendMapToRedis(long tripId, long senderId, Map<Long, Long> sendMap) {
		final String key = senderKey(tripId, senderId);

		// 0) 비었으면 정리 후 종료
		if (sendMap == null || sendMap.isEmpty()) {
			redis.delete(key);
			return;
		}

		// 1) String 변환 + 음수/0 필터
		Map<String, String> strMap = new HashMap<>();
		for (Map.Entry<Long, Long> e : sendMap.entrySet()) {
			Long recvId = e.getKey();
			Long amt = e.getValue();
			if (recvId != null && amt != null && amt > 0L) {
				strMap.put(String.valueOf(recvId), String.valueOf(amt));
			}
		}
		if (strMap.isEmpty()) {
			// 보낼 게 없으면 키 제거 + 인덱스에서 제거
			redis.delete(key);
			return;
		}

		// 2) 기존 해시 통째로 교체
		redis.delete(key);                       // 기존 값 제거
		redis.opsForHash().putAll(key, strMap); // 일괄 저장
		redis.expire(key, TTL);                  // TTL
	}

	public Map<Long, Long> getSendMapFromRedis(long tripId, long senderId) {
		Map<Object, Object> raw = redis.opsForHash().entries(senderKey(tripId, senderId));
		Map<Long, Long> out = new HashMap<>();
		for (var e : raw.entrySet()) {
			out.put(Long.parseLong(String.valueOf(e.getKey())), Long.parseLong(String.valueOf(e.getValue())));
		}
		return out;
	}

	public void clearTripSettlement(long tripId) {
		String pattern = PFX + ":" + tripId + ":*";
		Set<String> keys = redis.keys(pattern);
		if (!keys.isEmpty()) {
			redis.delete(keys);
		}
	}

	private static long nz(Long v) {
		return (v == null) ? 0L : v;
	}

	private static List<Long> resolveBeneficiaries(List<Long> must, Set<Long> tripMemberIds) {
		if (must == null || must.isEmpty())
			return new ArrayList<>(tripMemberIds);
		for (Long id : must)
			if (id == null || !tripMemberIds.contains(id))
				throw BusinessException.from(ExceptionCode.SHARE_MISSING);
		return must.stream().distinct().sorted().toList();
	}

	@Transactional(readOnly = true)
	public CostCalculateResponse calculate(Long tripId, Long userId) {
		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.INVALID_TRIP));

		// 이름도 리턴해야 하므로 초기에 memberId와 Name으로 Map으로 저장
		Map<Long, String> memberNameMap = trip.getTripMembers().stream()
			.collect(Collectors.toMap(
				tm -> tm.getMember().getId(),
				tm -> tm.getMember().getName()
			));

		Set<Long> memberIds = memberNameMap.keySet();
		if (!memberIds.contains(userId)) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}

		List<Cost> costs = costRepository.findAllWithMenusByTripId(tripId);
		if (costs.isEmpty()) {
			throw BusinessException.from(ExceptionCode.NO_COSTS);
		}

		Map<Long, Map<Long, Long>> ledger = new HashMap<>();

		for (Cost cost : costs) {
			Long payerId = cost.getPayer().getId();

			for (CostMenu m : Optional.ofNullable(cost.getCostMenus()).orElse(List.of())) {
				long menuTotal = nz(m.getAmount()) * m.getCount();
				List<Long> bens = resolveBeneficiaries(m.getMustPayerIds(), memberIds);
				if (bens.isEmpty())
					throw BusinessException.from(ExceptionCode.SHARE_MISSING);

				int n = bens.size();
				long base = menuTotal / n;
				// 나머지는 고려하지 않음. 우리 서비스에서 제공.

				for (Long benId : bens) {
					if (Objects.equals(benId, payerId))
						continue; // 자기 자신에게 청구 X
					ledger.computeIfAbsent(benId, k -> new HashMap<>())
						.merge(payerId, base, Long::sum);
				}
			}
		}

		Map<Long, Long> sendMap = new HashMap<>(); // 본인이 줘야 하는 것
		Map<Long, Long> recvMap = new HashMap<>(); // 본인이 받아야 하는 것

		Map<Long, Long> meRow = ledger.getOrDefault(userId, Map.of());
		for (Long otherId : memberIds) {
			if (Objects.equals(otherId, userId))
				continue;

			long meToOther = meRow.getOrDefault(otherId, 0L);
			long otherToMe = ledger.getOrDefault(otherId, Map.of()).getOrDefault(userId, 0L);

			if (meToOther > otherToMe) {
				sendMap.put(otherId, meToOther - otherToMe);
			} else if (otherToMe > meToOther) {
				recvMap.put(otherId, otherToMe - meToOther);
			}
		}

		saveSendMapToRedis(tripId, userId, sendMap);

		Set<Long> relatedMemberIds = new HashSet<>();
		relatedMemberIds.addAll(sendMap.keySet());
		relatedMemberIds.addAll(recvMap.keySet());
		int relatedCount = relatedMemberIds.size();

		List<CostCalculateResponse.ToSend> toSend = sendMap.entrySet().stream()
			.filter(e -> e.getValue() > 0)
			.map(e -> CostCalculateResponse.ToSend.builder()
				.targetMemberId(e.getKey())
				.targetMemberName(memberNameMap.get(e.getKey()))
				.amount(e.getValue())
				.build())
			.toList();

		List<CostCalculateResponse.ToReceive> toReceive = recvMap.entrySet().stream()
			.filter(e -> e.getValue() > 0)
			.map(e -> CostCalculateResponse.ToReceive.builder()
				.fromMemberId(e.getKey())
				.fromMemberName(memberNameMap.get(e.getKey()))
				.amount(e.getValue())
				.build())
			.toList();

		long netAmount = toReceive.stream().mapToLong(CostCalculateResponse.ToReceive::getAmount).sum()
			- toSend.stream().mapToLong(CostCalculateResponse.ToSend::getAmount).sum();

		return CostCalculateResponse.builder()
			.combinedSettlement(
				CostCalculateResponse.CombinedSettlement.builder()
					.memberId(userId)
					.memberName(memberNameMap.get(userId))
					.memberCount(relatedCount)
					.toSend(toSend)
					.toReceive(toReceive)
					.netAmount(netAmount)
					.build()
			)
			.build();
	}
}
