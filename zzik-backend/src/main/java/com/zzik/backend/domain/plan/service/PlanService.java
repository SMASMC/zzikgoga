package com.zzik.backend.domain.plan.service;

import static com.zzik.backend.global.security.jwt.invite.InviteTokenClaimKeys.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.response.InviteAcceptResponse;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.domain.plan.dto.response.TripSummaryResponse;
import com.zzik.backend.domain.plan.entity.Companion;
import com.zzik.backend.domain.plan.entity.Thema;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.entity.TripCompanion;
import com.zzik.backend.domain.plan.entity.TripMember;
import com.zzik.backend.domain.plan.entity.TripThema;
import com.zzik.backend.domain.plan.repository.CompanionRepository;
import com.zzik.backend.domain.plan.repository.ThemaRepository;
import com.zzik.backend.domain.plan.repository.TripCompanionRepository;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.domain.plan.repository.TripThemaRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.security.jwt.invite.InviteTokenProvider;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlanService {

	private static final DateTimeFormatter RESP_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

	private final TripRepository tripRepository;
	private final TripCompanionRepository tripCompanionRepository;
	private final TripMemberRepository tripMemberRepository;
	private final TripThemaRepository tripThemaRepository;
	private final CompanionRepository companionRepository;
	private final ThemaRepository themaRepository;
	private final EntityManager em;
	private final InviteTokenProvider inviteTokenProvider;
	private final StringRedisTemplate redisTemplate;

	@Value("${invite.base-url}")
	private String inviteBaseUrl;

	@Transactional(readOnly = true)
	public TripListResponse getTripList(Long memberId) {
		List<Trip> trips = tripRepository.findAllByOwnerIdOrderByCreatedAtDesc(memberId);

		List<TripSummaryResponse> items = new ArrayList<>();
		for (Trip t : trips) {
			items.add(TripSummaryResponse.builder()
				.tripId(t.getId())
				.title(t.getTitle())
				.startDate(t.getStartDate())
				.endDate(t.getEndDate())
				.thumbnail(null)
				.build());
		}
		return TripListResponse.builder().trip(items).build();
	}

	@Transactional
	public Long createTrip(CreateTripRequest req, Long ownerId) {
		validate(req);
		Member ownerRef = em.getReference(Member.class, ownerId);
		Trip trip = Trip.builder()
			.owner(ownerRef)
			.title(req.getTitle().trim())
			.startDate(req.getStartDate())
			.endDate(req.getEndDate())
			.maleCount(req.getMaleCount())
			.femaleCount(req.getFemaleCount())
			.isCostCompleted(false)
			.build();

		trip = tripRepository.save(trip);

		// 여행 생성한 사람 TripMember로 추가
		TripMember ownerMember = TripMember.builder()
			.trip(trip)
			.member(ownerRef)
			.isCostAccepted(false)
			.build();
		tripMemberRepository.save(ownerMember);

		// 동반자 태그 연결
		if (req.getCompanionId() != null && !req.getCompanionId().isEmpty()) {
			List<TripCompanion> links = new ArrayList<>();
			for (Long cid : req.getCompanionId()) {
				// 필요하면 가벼운 존재 검증
				if (!companionRepository.existsById(cid)) {
					throw BusinessException.from(ExceptionCode.INVALID_COMPANION);
				}
				Companion compRef = em.getReference(Companion.class, cid);
				links.add(TripCompanion.builder()
					.trip(trip)
					.companion(compRef)
					.build());
			}
			tripCompanionRepository.saveAll(links);
		}

		// 테마 태그 연결
		if (req.getThemaId() != null && !req.getThemaId().isEmpty()) {
			List<TripThema> links = new ArrayList<>();
			for (Long tid : req.getThemaId()) {
				if (!themaRepository.existsById(tid)) {
					throw BusinessException.from(ExceptionCode.INVALID_THEMA);
				}
				Thema themaRef = em.getReference(Thema.class, tid);
				links.add(TripThema.builder()
					.trip(trip)
					.thema(themaRef)
					.build());
			}
			tripThemaRepository.saveAll(links);
		}

		return trip.getId();
	}

	private void validate(CreateTripRequest req) {
		if (req.getTitle() == null || req.getTitle().isBlank()) {
			throw BusinessException.from(ExceptionCode.PLAN_INVALID_TITLE);
		}
		LocalDate s = req.getStartDate();
		LocalDate e = req.getEndDate();
		if (s == null || e == null || e.isBefore(s)) {
			throw BusinessException.from(ExceptionCode.PLAN_INVALID_DATE_RANGE);
		}
	}

	@Transactional(readOnly = true)
	public String createInviteLink(Long tripId, Long requesterId) {
		// 존재하는 여행인지 확인
		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND));

		// 해당 여행의 멤버가 맞는지 확인
		boolean isMember = trip.getOwner().getId().equals(requesterId)
			|| tripCompanionRepository.existsByTripIdAndCompanionId(tripId, requesterId);
		if (!isMember) {
			throw BusinessException.from(ExceptionCode.FORBIDDEN_TRIP);
		}

		// 링크 만료 시간 계산
		Instant now = Instant.now();
		Instant defaultExp = now.plus(Duration.ofHours(24));
		LocalDate cutoffDate = trip.getEndDate().plusDays(1);
		Instant hardCutoff = cutoffDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
		Instant finalExp = defaultExp.isBefore(hardCutoff) ? defaultExp : hardCutoff;

		Duration ttl = Duration.between(now, finalExp);
		if (ttl.isNegative() || ttl.isZero()) {
			// 여행이 이미 종료+1일을 지나 초대가 의미 없을 때
			throw BusinessException.from(ExceptionCode.PLAN_INVALID_DATE_RANGE);
		}

		// 초대 토큰 생성
		String jti = UUID.randomUUID().toString();
		Map<String, Object> claims = new HashMap<>();
		claims.put(TRIP_ID.getValue(), tripId);
		claims.put(PURPOSE.getValue(), "invite");
		claims.put(JTI.getValue(), jti);

		String token = inviteTokenProvider.issueInviteToken(claims, ttl);

		String key = "invite:trip:" + tripId + ":latest_jti";
		redisTemplate.opsForValue().set(key, jti, ttl);

		return inviteBaseUrl + "?token=" + token;
	}

	@Transactional
	public InviteAcceptResponse acceptInvite(String token, Long memberId) {
		try {
			var claims = inviteTokenProvider.getClaimsFromToken(token);
			Long tripId = ((Number)claims.get("tripId")).longValue();

			String jti = (String)claims.get("jti");
			assertLatestJti(tripId, jti);

			Trip trip = tripRepository.findById(tripId)
				.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND));

			boolean already = tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId);
			if (!already) {
				Member memberRef = em.getReference(Member.class, memberId);
				TripMember join = TripMember.builder()
					.trip(trip)
					.member(memberRef)
					.isCostAccepted(false)
					.build();
				tripMemberRepository.save(join);
			}

			return InviteAcceptResponse.builder()
				.joined(!already)
				.tripId(trip.getId())
				.build();

		} catch (io.jsonwebtoken.ExpiredJwtException e) {
			throw BusinessException.from(ExceptionCode.EXPIRED_ACCESS_TOKEN);
		} catch (Exception e) {
			throw BusinessException.from(ExceptionCode.MALFORMED_TOKEN);
		}
	}

	private void assertLatestJti(Long tripId, String jti) {
		String key = "invite:trip:" + tripId + ":jti";
		String saved = redisTemplate.opsForValue().get(key);

		if (saved == null) {
			// 처음 쓰는 링크라면 기록해둔다
			redisTemplate.opsForValue().set(key, jti);
			return;
		}

		if (!saved.equals(jti)) {
			throw BusinessException.from(ExceptionCode.INVITE_INVALID);
		}
	}

}
