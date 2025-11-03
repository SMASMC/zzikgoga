package com.zzik.backend.domain.cost.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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

	public void validateReceiptImage(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw BusinessException.from(ExceptionCode.UNSUPPORTED_IMAGE_TYPE);
		}
		if (file.getSize() > MAX_FILE_SIZE) {
			throw BusinessException.from(ExceptionCode.UPLOAD_SIZE_EXCEEDED);
		}
		String ext = getExt(file.getOriginalFilename());
		if (!ALLOWED_EXT.contains(ext)) {
			throw BusinessException.from(ExceptionCode.UNSUPPORTED_IMAGE_TYPE);
		}
	}

	public ReceiptOcrResponse ocrAndCreate(Long tripId, MultipartFile file, SaveCostRequest request) {
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
				objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8),
				headers
			);

			ResponseEntity<String> resp = restTemplate.exchange(
				props.invokeUrl(),
				HttpMethod.POST,
				req,
				String.class
			);

			if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
				throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
			}

			JsonNode root = objectMapper.readTree(resp.getBody());
			ReceiptOcrResponse ocrResult = toResponse(tripId, root);

			SaveCostRequest mapped = mapOcrToRequest(ocrResult);
			Long costId = createCost(tripId, mapped);

			log.info("OCR 처리 완료. costId={}", costId);
			return ocrResult;

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.error("OCR 처리 중 오류", e);
			throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
		}
	}

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
			String resultPrice = safeText(result, "totalPrice", "price", "formatted");

			List<ReceiptItemDto> items = new ArrayList<>();
			JsonNode subs = result.get("subResults");
			if (subs != null && subs.isArray()) {
				for (JsonNode item : subs) {
					String name = safeText(item, "name", "text");
					String count = safeText(item, "count", "text");
					String price = safeText(item, "price", "price", "formatted");
					if (StringUtils.hasText(name) && StringUtils.hasText(price)) {
						items.add(new ReceiptItemDto(name, count, price));
					}
				}
			}

			// OCR 확장 필드들(카드사/번호/할부/승인번호/총액/추론결과)은 없을 수 있으므로 null 허용
			String cardCompany = safeText(result, "paymentInfo", "cardInfo", "company", "text");
			String cardNumber = safeText(result, "paymentInfo", "cardInfo", "number", "text");
			String installmentMonths = safeText(result, "paymentInfo", "installment", "month", "text");
			String approvalNumber = safeText(result, "paymentInfo", "approvalNo", "text");
			String totalPrice = safeText(result, "totalPrice", "price", "formatted");
			String inferResult = safeText(images.get(0), "inferResult");
			return new ReceiptOcrResponse(
					tripId,
					storeName,
					date,
					cardCompany,
					cardNumber,
					installmentMonths,
					approvalNumber,
					totalPrice,
					resultPrice,
					items,
					inferResult
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
			throw new IllegalArgumentException("요청 본문이 비어 있습니다.");
		if (req.getItems() == null || req.getItems().isEmpty())
			throw new IllegalArgumentException("items가 비어 있습니다.");
		if (!StringUtils.hasText(req.getPlace()))
			throw new IllegalArgumentException("place는 필수입니다.");
		if (!StringUtils.hasText(req.getPaidAt()))
			throw new IllegalArgumentException("paidAt은 필수입니다.");
		// 1) 메뉴 금액 합산
		long itemsTotal = 0L;
		for (SaveCostMenuItem i : req.getItems()) {
			long amount = resolveAmount(i);
			itemsTotal += amount;
		}

		// 2) 최종 총액 결정(입력된 items 합계, 입력 총액과 차 검증)
		long finalTotal = (req.getTotalAmount() == null) ? itemsTotal : req.getTotalAmount();
		if (req.getTotalAmount() != null) {
			long diff = Math.abs(req.getTotalAmount() - itemsTotal);
			long tol = Math.max(100L, Math.round(itemsTotal * 0.01));
			if (diff > tol) {
				log.warn("총액 불일치 reported={}, items={}, diff={}", req.getTotalAmount(), itemsTotal, diff);
				finalTotal = itemsTotal;
			}
		}

		// TODO: SecurityContext에서 로그인 사용자 ID 추출
		Long memberId = 3L;
		Member createdBy = memberRepository.findById(memberId)
			.orElseThrow(() -> new IllegalArgumentException("로그인 사용자를 찾을 수 없습니다."));

		Member payer = createdBy;
		if (req.getPayerId() != null) {
			payer = memberRepository.findById(req.getPayerId())
				.orElseThrow(() -> new IllegalArgumentException("payerId 멤버를 찾을 수 없습니다."));
		}

		Trip trip = tripRepository.findById(tripId)
			.orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행입니다."));

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

		// 4) cost_menu 저장 (must_payer_ids JSONB 사용)
		List<CostMenu> menus = new ArrayList<>();
		for (SaveCostMenuItem dto : req.getItems()) {
			long amount = resolveAmount(dto);
			String mustJson = null;
			if (dto.getMemberIds() != null && !dto.getMemberIds().isEmpty()) {
				Set<Long> uniq = new LinkedHashSet<>(dto.getMemberIds());
				mustJson = toJson(new ArrayList<>(uniq));
			}
			CostMenu m = CostMenu.builder()
				.cost(cost)
				.menuName(dto.getMenuName().trim())
				.amount(amount)
				.mustPayerIds(mustJson)
				.build();
			menus.add(m);
		}
		costMenuRepository.saveAll(menus);

		final Long costId = cost.getId();
		log.info("Created cost id={}, total={}, menus={}", costId, finalTotal, menus.size());
		return costId;
	}

	private long resolveAmount(SaveCostMenuItem i) {
		return Math.max(0L, i.getAmount());
	}

	private String trimOrNull(String s) {
		return (s == null || s.isBlank()) ? null : s.trim();
	}

	/** 메뉴별 정산자 추가 (JSONB must_payer_ids) */
	@Transactional
	public void addMember(Long costMenuId, Long memberId) {
		CostMenu menu = costMenuRepository.findById(costMenuId)
			.orElseThrow(() -> new IllegalArgumentException("cost_menu not found: " + costMenuId));
		Set<Long> ids = parseIds(menu.getMustPayerIds());
		if (ids.add(memberId)) {
			menu.setMustPayerIds(toJson(ids));
			costMenuRepository.save(menu);
		}
	}

	/** 메뉴에서 정산자 제거 (JSONB must_payer_ids) */
	@Transactional
	public void removeMember(Long costMenuId, Long memberId) {
		CostMenu menu = costMenuRepository.findById(costMenuId)
			.orElseThrow(() -> new IllegalArgumentException("cost_menu not found: " + costMenuId));
		Set<Long> ids = parseIds(menu.getMustPayerIds());
		if (ids.remove(memberId)) {
			menu.setMustPayerIds(toJson(ids));
			costMenuRepository.save(menu);
		}
	}

	private Set<Long> parseIds(String json) {
		if (json == null || json.isBlank())
			return new LinkedHashSet<>();
		try {
			Long[] arr = objectMapper.readValue(json, Long[].class);
			return new LinkedHashSet<>(java.util.Arrays.asList(arr));
		} catch (Exception e) {
			return new LinkedHashSet<>();
		}
	}

	private String toJson(Collection<Long> ids) {
		try {
			return objectMapper.writeValueAsString(ids);
		} catch (Exception e) {
			throw new IllegalArgumentException("must_payer_ids serialization failed", e);
		}
	}

	private SaveCostRequest mapOcrToRequest(ReceiptOcrResponse ocr) {
		List<SaveCostMenuItem> menuItems = new ArrayList<>();

		// OCR에서 menu 리스트가 있으면 변환
		if (ocr.items() != null) {
			for (ReceiptItemDto i : ocr.items()) {
				long price = 0L;
				try {
					price = Long.parseLong(i.price().replaceAll("[^0-9]", ""));
				} catch (Exception ignore) {
				}

				menuItems.add(SaveCostMenuItem.builder()
					.menuName(i.name())
					.amount(price)
					.build());
			}
		}

		return SaveCostRequest.builder()
			.createdBy(null)
			.payerId(null)
			.place(ocr.storeName())
			.paidAt(ocr.date())
			.totalAmount(parseLongSafe(ocr.resultPrice()))
			.receiptJson(null)
			.items(menuItems)
			.build();
	}

	private Long parseLongSafe(String s) {
		try {
			return Long.parseLong(s.replaceAll("[^0-9]", ""));
		} catch (Exception ignore) {
			return null;
		}
	}
}
