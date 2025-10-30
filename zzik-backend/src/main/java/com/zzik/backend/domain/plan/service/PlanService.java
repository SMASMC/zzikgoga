package com.zzik.backend.domain.plan.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.plan.dto.request.CreateTripRequest;
import com.zzik.backend.domain.plan.dto.response.TripListResponse;
import com.zzik.backend.domain.plan.dto.response.TripSummaryResponse;
import com.zzik.backend.domain.plan.entity.Companion;
import com.zzik.backend.domain.plan.entity.Thema;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.entity.TripCompanion;
import com.zzik.backend.domain.plan.entity.TripThema;
import com.zzik.backend.domain.plan.repository.CompanionRepository;
import com.zzik.backend.domain.plan.repository.ThemaRepository;
import com.zzik.backend.domain.plan.repository.TripCompanionRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.domain.plan.repository.TripThemaRepository;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlanService {

	private static final DateTimeFormatter RESP_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

	private final TripRepository tripRepository;
	private final TripCompanionRepository tripCompanionRepository;
	private final TripThemaRepository tripThemaRepository;
	private final CompanionRepository companionRepository;
	private final ThemaRepository themaRepository;
	private final EntityManager em;

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
}
