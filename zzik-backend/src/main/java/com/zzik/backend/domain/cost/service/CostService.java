package com.zzik.backend.domain.cost.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.cost.config.ClovaOcrProperties;
import com.zzik.backend.domain.cost.dto.request.SaveCostMenuItem;
import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
import com.zzik.backend.domain.cost.dto.response.ReceiptItemDto;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.repository.CostMenuRepository;
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
public class CostService {

	private final ClovaOcrProperties props;

	private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "pdf", "tif", "tiff");

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final RestTemplate restTemplate = new RestTemplate();

	private final CostRepository costRepository;
	private final CostMenuRepository costMenuRepository;
	private final TripRepository tripRepository;
	@Autowired
	private MemberRepository memberRepository;

	// 사진 검증
	public void validateReceiptImage(MultipartFile file) {
		if (file == null || file.isEmpty())
			throw BusinessException.from(ExceptionCode.UNSUPPORTED_IMAGE_TYPE);
		if (file.getSize() > MAX_FILE_SIZE)
			throw BusinessException.from(ExceptionCode.UPLOAD_SIZE_EXCEEDED);
		String ext = getExt(file.getOriginalFilename());
		if (!ALLOWED_EXT.contains(ext))
			throw BusinessException.from(ExceptionCode.UNSUPPORTED_IMAGE_TYPE);
	}

	// OCR + 저장
	public ReceiptOcrResponse ocrAndCreate(Long tripId, MultipartFile file) {
		validateReceiptImage(file);
		try {
			String base64 = Base64.getEncoder().encodeToString(file.getBytes());
			Map<String, Object> body = new HashMap<>();
			body.put("version", "V2");
			body.put("requestId", UUID.randomUUID().toString());
			body.put("timestamp", Instant.now().toEpochMilli());

			Map<String, Object> image = new HashMap<>();
			image.put("format", getExt(file.getOriginalFilename()));
			image.put("name", "receipt");
			image.put("data", base64);
			body.put("images", List.of(image));

			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			headers.set("X-OCR-SECRET", props.secretKey());

			HttpEntity<byte[]> req = new HttpEntity<>(
				objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8), headers);

			ResponseEntity<String> resp = restTemplate.exchange(
				props.invokeUrl(), HttpMethod.POST, req, String.class);

			if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null)
				throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);

			JsonNode root = objectMapper.readTree(resp.getBody());
			log.info("OCR 처리 완료 costId={}", root);
			ReceiptOcrResponse ocrResult = toResponse(tripId, root);
			log.debug(ocrResult.toString());

			if (ocrResult.totalPrice() == null || ocrResult.totalPrice() == 0L) {
				throw BusinessException.from(ExceptionCode.ZERO_TOTAL_AMOUNT); // ZERO 예외 코드
			}

			SaveCostRequest mapped = mapOcrToRequest(ocrResult);

			Long costId = createCost(tripId, mapped);
			log.info("[OCR->CREATE] created costId={}, items={}", costId, mapped.getItems().size());
			return ocrResult;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("OCR 처리 중 오류", e);
			throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
		}
	}

	// OCR 응답 파싱
	private ReceiptOcrResponse toResponse(Long tripId, JsonNode root) {
		try {
			JsonNode images = root.get("images");
			if (images == null || images.isEmpty())
				throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
			JsonNode result = images.get(0).get("receipt").get("result");
			if (result == null)
				throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);

			String storeName = safeText(result, "storeInfo", "name", "text");
			String date = safeText(result, "paymentInfo", "date", "text");

			// 총금액(Long)으로 파싱
			Long totalPrice = parseLongSafe(
				safeText(result, "totalPrice", "price", "formatted", "value")
			);

			List<ReceiptItemDto> items = new ArrayList<>();
			JsonNode subs = result.get("subResults");
			if (subs != null && subs.isArray()) {
				for (JsonNode sub : subs) {
					JsonNode subItems = sub.get("items");
					if (subItems == null || !subItems.isArray())
						continue;
					for (JsonNode item : subItems) {
						String name = safeText(item, "name", "text");
						String count = safeText(item, "count", "text");
						String price = safeText(item, "price", "price", "formatted",
							"value");
						if (StringUtils.hasText(name) && StringUtils.hasText(price)) {
							items.add(new ReceiptItemDto(name, count, price));
						}
					}
				}
			}

			String cardCompany = safeText(result, "paymentInfo", "cardInfo", "company", "text");
			String cardNumber = safeText(result, "paymentInfo", "cardInfo", "number", "text");

			return new ReceiptOcrResponse(
				tripId,
				storeName,
				date,
				cardCompany,
				cardNumber,
				totalPrice,
				items
			);
		} catch (Exception e) {
			log.error("OCR 응답 파싱 실패", e);
			throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
		}
	}

	private String safeText(JsonNode parent, String... path) {
		JsonNode node = parent;
		for (String p : path) {
			if (node == null)
				return null;
			node = node.get(p);
		}
		return node != null && !node.isNull() ? node.asText() : null;
	}

	private String getExt(String name) {
		if (!StringUtils.hasText(name) || !name.contains("."))
			return "jpg";
		return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
	}

	@Transactional
	public Long createCost(Long tripId, SaveCostRequest req) {
		log.debug("CreateCost IN: tripId={}, createdBy={}, payerId={}, place={}, itemsNull={}, itemsSize={}",
			tripId, req.getCreatedBy(), req.getPayerId(), req.getPlace(),
			req.getItems() == null, req.getItems() == null ? null : req.getItems().size());

		if (req == null)
			throw BusinessException.from(ExceptionCode.RECEIPT_CONTEXT_INVALID);
		if (req.getItems() == null || req.getItems().isEmpty())
			throw BusinessException.from(ExceptionCode.RECEIPT_CONTEXT_INVALID);
		if (!StringUtils.hasText(req.getPlace()))
			throw BusinessException.from(ExceptionCode.RECEIPT_CONTEXT_INVALID);
		if (!StringUtils.hasText(req.getPaidAt()))
			throw BusinessException.from(ExceptionCode.RECEIPT_CONTEXT_INVALID);

		// TODO: SecurityContext에서 로그인 사용자 ID 추출
		Long memberId = 3L;
		Member createdBy = memberRepository.findById(memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_USER));

		Member payer = createdBy;
		if (req.getPayerId() != null) {
			payer = memberRepository.findById(req.getPayerId())
				.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_USER));
		}

		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.TRIP_NOT_FOUND));

		// 총금액 결정: 요청 total > 0 사용, 아니면 항목 합계
		long itemsSum = req.getItems().stream()
			.filter(Objects::nonNull)
			.map(SaveCostMenuItem::getAmount)
			.filter(Objects::nonNull)
			.mapToLong(Long::longValue)
			.sum();

		Long reqTotal = req.getTotalAmount();
		long finalTotal = (reqTotal != null) ? reqTotal : itemsSum;

		// 방어: 0이면 ZERO 예외
		if (finalTotal <= 0L) {
			throw BusinessException.from(ExceptionCode.ZERO_TOTAL_AMOUNT);
		}

		// 3) cost 저장
		Cost cost = Cost.builder()
			.trip(trip)
			.createdBy(createdBy)
			.payer(payer)
			.paidAt(req.getPaidAt().trim())
			.place(req.getPlace().trim())
			.totalAmount(finalTotal)
			.memo(trimOrNull(req.getMemo()))
			.receipt(trimOrNull(req.getReceiptJson()))
			.build();
		cost = costRepository.save(cost);

		// 메뉴 저장
		List<CostMenu> menus = new ArrayList<>();
		for (SaveCostMenuItem dto : req.getItems()) {
			long amount = resolveAmount(dto);
			Integer count = dto.getCount();
			count = (count == null || count <= 0) ? 1 : count;
			List<Long> mustJson = null;
			if (dto.getMemberIds() != null && !dto.getMemberIds().isEmpty()) {
				List<Long> uniq = dto.getMemberIds().stream()
					.filter(Objects::nonNull)
					.distinct()
					.sorted()
					.collect(Collectors.toList());
				mustJson = uniq;
			}
			CostMenu m = CostMenu.builder()
				.cost(cost)
				.menuName(dto.getMenuName().trim())
				.count(count)
				.amount(amount)
				.mustPayerIds(mustJson)
				.build();
			menus.add(m);
			// costMenuRepository.save(m);
		}
		costMenuRepository.saveAll(menus);

		log.info("Created cost id={}, total={}, menus={}", cost.getId(), finalTotal, menus.size());
		return cost.getId();
	}

	private long resolveAmount(SaveCostMenuItem i) {
		return Math.max(0L, i.getAmount());
	}

	private String trimOrNull(String s) {
		return (s == null || s.isBlank()) ? null : s.trim();
	}

	@Transactional
	public void replaceMembers(Long costMenuId, List<Long> memberIds) {
		CostMenu menu = costMenuRepository.findById(costMenuId)
			.orElseThrow(() -> new IllegalArgumentException("cost_menu not found: " + costMenuId));
		if (memberIds == null || memberIds.isEmpty()) {
			menu.setMustPayerIds(null);
		} else {
			List<Long> uniq = memberIds.stream().filter(Objects::nonNull).distinct().sorted().toList();
			menu.setMustPayerIds(uniq);
		}
		costMenuRepository.save(menu);
	}

	private SaveCostRequest mapOcrToRequest(ReceiptOcrResponse ocr) {
		List<SaveCostMenuItem> menuItems = new ArrayList<>();
		List<Long> allMemberIds = getTripMemberIds(ocr.tripId());

		if (ocr.items() != null) {
			for (ReceiptItemDto i : ocr.items()) {
				long price = 0L;
				try {
					price = Long.parseLong(i.price().replaceAll("[^0-9]", ""));
				} catch (Exception ignore) {
				}
				int cnt = parseIntSafe(i.count(), 1);
				menuItems.add(SaveCostMenuItem.builder()
					.menuName(i.name())
					.count(cnt)
					.amount(price)
					.memberIds(new ArrayList<>(allMemberIds)).build());
			}
		}

		return SaveCostRequest.builder()
			.createdBy(null)
			.payerId(null)
			.place(ocr.storeName())
			.paidAt(ocr.date())
			.totalAmount(ocr.totalPrice())
			.receiptJson(null)
			.items(menuItems)
			.build();
	}

	private int parseIntSafe(String s, int defaultVal) {
		try {
			return Integer.parseInt(s.replaceAll("[^0-9]", ""));
		} catch (Exception ignore) {
			return defaultVal;
		}
	}

	// 현재 여행에 포함된 멤버들 ID
	private List<Long> getTripMemberIds(Long tripId) {
		if (!tripRepository.existsById(tripId)) {
			throw BusinessException.from(ExceptionCode.TRIP_NOT_FOUND);
		}
		List<Long> memberIds = tripRepository.findMemberIdsByTripId(tripId);
		return memberIds.stream()
			.filter(Objects::nonNull)
			.distinct()
			.sorted()
			.toList();
	}

	private Long parseLongSafe(String s) {
		try {
			return Long.parseLong(s.replaceAll("[^0-9]", ""));
		} catch (Exception ignore) {
			return null;
		}
	}
}
