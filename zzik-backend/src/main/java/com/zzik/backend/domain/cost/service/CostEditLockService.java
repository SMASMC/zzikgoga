package com.zzik.backend.domain.cost.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.dto.response.EditStatusResponse;
import com.zzik.backend.domain.cost.dto.response.EditingMember;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.repository.CostRepository;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostEditLockService {

	private final StringRedisTemplate redis;
	private final MemberRepository memberRepository;
	private final CostRepository costRepository;
	private final TripMemberRepository tripMemberRepository;

	public static final long LOCK_TTL_SECONDS = TimeUnit.MINUTES.toSeconds(5);
	private static final ZoneId KST = ZoneId.of("Asia/Seoul");
	private static final DateTimeFormatter ISO_LOCAL_KST =
		DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(KST);

	private String keyOf(Long tripId, Long costId) {
		return "cost:edit:trip:" + tripId + ":cost:" + costId;
	}

	/** 잠금 상태 조회 (만료된 키 정리 포함) */
	public EditStatusResponse getEditStatus(Long tripId, Long costId) {
		Long me = SecurityUtil.getCurrentMemberId();
		validateAccess(tripId, costId, me);
		String key = keyOf(tripId, costId);

		// TTL 확인: -2=없음, -1=만료없음, 그 외=남은 초
		Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
		if (ttl != null && ttl <= 0) {
			redis.delete(key);
		}

		Map<Object, Object> map = redis.opsForHash().entries(key);
		boolean hasLock = map != null && !map.isEmpty();

		boolean isOwner = false;
		EditingMember editingMember = null;
		String startedAtIso = null;

		if (hasLock) {
			String lockedMemberId = (String)map.get("memberId");
			String memberName = (String)map.get("memberName");
			String thumbnail = (String)map.get("thumbnailUrl");
			String startedAt = (String)map.get("startedAt");

			Long lockedId = null;
			try {
				lockedId = lockedMemberId == null ? null : Long.parseLong(lockedMemberId);
			} catch (NumberFormatException ignored) {
			}

			isOwner = (lockedId != null && lockedId.equals(me));

			editingMember = EditingMember.builder()
				.memberId(lockedId)
				.memberName(memberName)
				.thumbnailUrl(thumbnail)
				.build();

			if (startedAt != null) {
				try {
					long epochMs = Long.parseLong(startedAt);
					startedAtIso = ISO_LOCAL_KST.format(Instant.ofEpochMilli(epochMs));
				} catch (NumberFormatException ignored) {
				}
			}
		}

		boolean canEdit = !hasLock || isOwner;

		return EditStatusResponse.builder()
			.costId(costId)
			.isEditing(hasLock)
			.editingMember(editingMember)
			.editStartedAt(startedAtIso)
			.canEdit(canEdit)
			.build();
	}

	public boolean tryAcquire(Long tripId, Long costId) {
		String key = keyOf(tripId, costId);
		Long me = SecurityUtil.getCurrentMemberId();
		validateAccess(tripId, costId, me);

		// 이미 내 잠금이면 TTL만 갱신
		Map<Object, Object> map = redis.opsForHash().entries(key);
		if (map != null && !map.isEmpty()) {
			String lockedMemberId = (String)map.get("memberId");
			if (lockedMemberId != null && lockedMemberId.equals(String.valueOf(me))) {
				redis.expire(key, LOCK_TTL_SECONDS, TimeUnit.SECONDS);
				return true;
			} else {
				return false;
			}
		}
		Member meMember = memberRepository.findById(me)
			.orElse(null);
		String myName = (meMember != null && meMember.getName() != null) ? meMember.getName() : "알수없음";
		String myThumb = (meMember != null && meMember.getThumbnailUrl() != null) ? meMember.getThumbnailUrl() : null;

		// 새 잠금 생성
		redis.opsForHash().put(key, "memberId", String.valueOf(me));
		redis.opsForHash().put(key, "memberName", myName);
		redis.opsForHash().put(key, "thumbnailUrl", myThumb == null ? "" : myThumb);
		redis.opsForHash().put(key, "startedAt", String.valueOf(System.currentTimeMillis()));
		redis.expire(key, LOCK_TTL_SECONDS, TimeUnit.SECONDS);
		return true;
	}

	/** TTL 갱신 (페이지 머무는 동안 주기 호출) */
	public void renew(Long tripId, Long costId) {
		String key = keyOf(tripId, costId);
		Long me = SecurityUtil.getCurrentMemberId();
		validateAccess(tripId, costId, me);
		Map<Object, Object> map = redis.opsForHash().entries(key);
		if (map == null || map.isEmpty())
			return;

		String lockedMemberId = (String)map.get("memberId");
		if (lockedMemberId != null && lockedMemberId.equals(String.valueOf(me))) {
			redis.expire(key, LOCK_TTL_SECONDS, TimeUnit.SECONDS);
		}
	}

	/** 잠금 해제 (소유자만) */
	public boolean release(Long tripId, Long costId) {
		String key = keyOf(tripId, costId);
		Long me = SecurityUtil.getCurrentMemberId();
		validateAccess(tripId, costId, me);
		Map<Object, Object> map = redis.opsForHash().entries(key);
		if (map == null || map.isEmpty())
			return true;

		String lockedMemberId = (String)map.get("memberId");
		if (lockedMemberId != null && lockedMemberId.equals(String.valueOf(me))) {
			redis.delete(key);
			return true;
		}
		return false;
	}

	private void validateAccess(Long tripId, Long costId, Long memberId) {
		Cost cost = costRepository.findById(costId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.INVALID_COST));
		if (!cost.getTrip().getId().equals(tripId)) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}
		boolean isMember = tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId);
		if (!isMember) {
			throw BusinessException.from(ExceptionCode.NOT_TRIP_MEMBER);
		}
	}

	public boolean isOwnedBy(Long tripId, Long costId, Long memberId) {
		validateAccess(tripId, costId, memberId);
		String key = keyOf(tripId, costId);

		Long ttl = redis.getExpire(key, TimeUnit.SECONDS);
		if (ttl <= 0) {
			redis.delete(key);
			return false;
		}
		Map<Object, Object> map = redis.opsForHash().entries(key);
		if (map.isEmpty())
			return false;

		String lockedMemberId = (String)map.get("memberId");
		return String.valueOf(memberId).equals(lockedMemberId);
	}

}
