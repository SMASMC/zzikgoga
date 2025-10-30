package com.zzik.backend.domain.cost.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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
import com.zzik.backend.domain.cost.config.ClovaOcrProperties;
import com.zzik.backend.domain.cost.dto.request.SaveCostMenuItem;
import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
import com.zzik.backend.domain.cost.dto.response.ReceiptItemDto;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.domain.cost.entity.Cost;
import com.zzik.backend.domain.cost.entity.CostMenu;
import com.zzik.backend.domain.cost.entity.CostMenuMember;
import com.zzik.backend.domain.cost.repository.CostMenuMemberRepository;
import com.zzik.backend.domain.cost.repository.CostMenuRepository;
import com.zzik.backend.domain.cost.repository.CostRepository;
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
	private final CostMenuMemberRepository costMenuMemberRepository;

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

	public ReceiptOcrResponse recognizeReceipt(Long tripId, MultipartFile file) {
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
			return toResponse(tripId, root);

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.warn("OCR 호출 실패: {}", e.toString());
			throw BusinessException.from(ExceptionCode.OCR_PROCESS_FAIL);
		}
	}

	private ReceiptOcrResponse toResponse(Long tripId, JsonNode root) {
		try {
			String pretty = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
			log.info("\n✅ OCR Response:\n{}", pretty);
		} catch (Exception e) {
			log.warn("❌ Failed logging OCR response: {}", e.getMessage());
		}

		JsonNode image0 = root.path("images").path(0);
		String inferResult = image0.path("inferResult").asText();
		JsonNode result = image0.path("receipt").path("result");

		// 가게명
		String store = text(result, "storeInfo", "name", "text");
		String subStore = text(result, "storeInfo", "subName", "text");
		if (StringUtils.hasText(subStore))
			store = store + " " + subStore;

		// 결제일
		String date = text(result, "paymentInfo", "date", "text");

		// 카드정보
		String cardCompany = text(result, "paymentInfo", "cardInfo", "company", "text");
		String cardNumber = text(result, "paymentInfo", "cardInfo", "number", "text");
		String installment = text(result, "paymentInfo", "cardInfo", "installmentPlanMonths", "text");
		String approval = text(result, "paymentInfo", "confirmNum", "text");

		// 라인 아이템
		List<ReceiptItemDto> items = new ArrayList<>();
		JsonNode subResults = result.path("subResults");
		if (subResults.isArray()) {
			for (JsonNode sr : subResults) {
				JsonNode srItems = sr.path("items");
				if (srItems.isArray()) {
					for (JsonNode it : srItems) {
						String name = text(it, "name", "text");
						String count = text(it, "count", "text");
						// 가격은 it.price.price.* 구조가 일반적
						String price = readPriceLike(it.path("price").path("price"));
						if (!StringUtils.hasText(price)) {
							price = readPriceLike(it.path("price")); // 폴백
						}
						items.add(new ReceiptItemDto(name, count, price));
					}
				}
			}
		}

		// === 총합(결제금액) 계산: 다단계 폴백 ===
		// 1) 대표 필드들
		String total = firstNonEmpty(
			readPriceLike(result.path("resultPrice").path("price")),
			readPriceLike(result.path("paymentPrice").path("price")),
			readPriceLike(result.path("totalPrice").path("price")),
			readPriceLike(result.path("totalPayment").path("price")),
			readPriceLike(result.path("totalAmount").path("price")),
			readPriceLike(result.path("total").path("price")),
			readPriceLike(result.path("amount").path("price"))
		);

		// 2) keyText(합계/총액/결제금액 등) 기반 검색
		if (!StringUtils.hasText(total)) {
			total = findPriceByKeyText(result);
		}

		// 3) 라인아이템 가격 합산
		if (!StringUtils.hasText(total)) {
			total = sumLineItems(result);
		}

		// 결과금액 = total (필요시 별도 분기 가능)
		String resultPrice = total;

		return new ReceiptOcrResponse(
			tripId, store, date, cardCompany, cardNumber, installment, approval,
			total, resultPrice, items, inferResult
		);
	}

	/** 안전한 텍스트 추출: {formatted.value} 우선, 없으면 text 사용 */
	private String text(JsonNode node, String... path) {
		JsonNode cur = node;
		for (String p : path)
			cur = cur.path(p);
		if (cur.isMissingNode())
			return "";
		String formatted = cur.path("formatted").path("value").asText(null);
		if (formatted != null)
			return formatted;
		return cur.asText("");
	}

	/** "114,000" / {"formatted":{"value":"114000"}} 등 형태를 공통 처리 */
	private String readPriceLike(JsonNode node) {
		if (node == null || node.isMissingNode())
			return "";
		// formatted.value 우선
		String v = node.path("formatted").path("value").asText(null);
		if (StringUtils.hasText(v))
			return v;
		// 텍스트에 콤마가 있는 경우 숫자만 추출
		String t = node.path("text").asText("");
		if (StringUtils.hasText(t))
			return t.replaceAll("[^0-9]", "");
		// 마지막 폴백(노드 자체 문자열)
		String raw = node.asText("");
		return raw.replaceAll("[^0-9]", "");
	}

	/** keyText가 "합계/총액/결제금액/총금액/청구금액" 류인 price를 DFS로 탐색 */
	private String findPriceByKeyText(JsonNode node) {
		if (node == null || node.isMissingNode())
			return "";
		String[] keys = {"합계", "총액", "총구매액", "결제금액", "총금액", "청구금액"};

		if (node.has("keyText")) {
			String k = node.path("keyText").asText("");
			for (String cand : keys) {
				if (k.contains(cand)) {
					// price 하위 우선
					if (node.has("price")) {
						String p = readPriceLike(node.path("price"));
						if (StringUtils.hasText(p))
							return p;
					}
					// 노드 자체가 price인 경우
					String self = readPriceLike(node);
					if (StringUtils.hasText(self))
						return self;
				}
			}
		}
		for (JsonNode child : node) {
			String got = findPriceByKeyText(child);
			if (StringUtils.hasText(got))
				return got;
		}
		return "";
	}

	/** 라인아이템의 price 합산 */
	private String sumLineItems(JsonNode result) {
		long sum = 0;
		JsonNode subResults = result.path("subResults");
		if (subResults.isArray()) {
			for (JsonNode sr : subResults) {
				JsonNode items = sr.path("items");
				if (items.isArray()) {
					for (JsonNode it : items) {
						String v = readPriceLike(it.path("price").path("price"));
						if (!StringUtils.hasText(v))
							v = readPriceLike(it.path("price"));
						if (StringUtils.hasText(v)) {
							try {
								sum += Long.parseLong(v);
							} catch (Exception ignore) {
							}
						}
					}
				}
			}
		}
		return sum > 0 ? String.valueOf(sum) : "";
	}

	private String firstNonEmpty(String... vals) {
		for (String s : vals)
			if (StringUtils.hasText(s))
				return s;
		return "";
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
		// 1) 메뉴 금액 확정 + 합계
		long itemsTotal = 0L;
		List<CostMenu> menus = new ArrayList<>();
		for (SaveCostMenuItem i : req.getItems()) {
			long amount = resolveAmount(i);
			itemsTotal += amount;

			CostMenu m = CostMenu.builder()
				//.costId(null) // cost 저장 후 채움
				.menuName(i.getMenuName().trim())
				.amount(amount)
				//.nCostMenuMember((byte)0)
				.build();
			menus.add(m);
		}

		// 2) 최종 총액 결정(없으면 items 합계, 있으면 허용오차 검증)
		long finalTotal = (req.getTotalAmount() == null) ? itemsTotal : req.getTotalAmount();
		if (req.getTotalAmount() != null) {
			long diff = Math.abs(req.getTotalAmount() - itemsTotal);
			long tol = Math.max(100L, Math.round(itemsTotal * 0.01)); // ±100원 또는 ±1%
			if (diff > tol) {
				log.warn("총액 불일치: reported={}, items={}, diff={}", req.getTotalAmount(), itemsTotal, diff);
				finalTotal = itemsTotal; // 라인아이템 합 우선
			}
		}

		// 3) cost 저장
		Cost cost = Cost.builder()
			//.tripId(tripId)
			//.createdBy(req.getCreatedBy())
			//.payerId(req.getPayerId())
			.paidAt(req.getPaidAt().trim())
			.place(req.getPlace().trim())
			.totalAmount(finalTotal)
			.memo(trimOrNull(req.getMemo()))
			.receipt(trimOrNull(req.getReceiptJson()))
			.build();
		cost = costRepository.save(cost);

		// 4) cost_menu 저장
		final Long costId = cost.getId();
		//menus.forEach(m -> m.setCostId(costId));
		costMenuRepository.saveAll(menus);

		// 5) (옵션) 초기 배분이 온 경우 cost_menu_member 생성 + 카운터 갱신
		for (int idx = 0; idx < menus.size(); idx++) {
			var dto = req.getItems().get(idx);
			var menu = menus.get(idx);

			int created = 0;
			if (dto.getMemberIds() != null && !dto.getMemberIds().isEmpty()) {
				Set<Long> uniq = new LinkedHashSet<>(dto.getMemberIds());
				List<CostMenuMember> links = new ArrayList<>();
				for (Long memberId : uniq) {
					links.add(CostMenuMember.builder()
						.costMenuId(menu.getId())
						.memberId(memberId)
						.build());
				}
				costMenuMemberRepository.saveAll(links);
				created = uniq.size();
			}
			if (created > 0) {
				//menu.setNCostMenuMember((byte)created);
			}
		}
		costMenuRepository.saveAll(menus);

		log.info("Created cost id={}, total={}, menus={}", costId, finalTotal, menus.size());
		return costId;
	}

	private long resolveAmount(SaveCostMenuItem i) {
		return Math.max(0L, i.getAmount());
	}

	private String trimOrNull(String s) {
		return (s == null || s.isBlank()) ? null : s.trim();
	}

	/** 메뉴에 정산자 추가 */
	@Transactional
	public void addMember(Long costMenuId, Long memberId) {
		if (!costMenuMemberRepository.existsByCostMenuIdAndMemberId(costMenuId, memberId)) {
			costMenuMemberRepository.save(
				CostMenuMember.builder().costMenuId(costMenuId).memberId(memberId).build()
			);
			recomputeCount(costMenuId);
		}
	}

	/** 메뉴에서 정산자 제거 */
	@Transactional
	public void removeMember(Long costMenuId, Long memberId) {
		costMenuMemberRepository.deleteByCostMenuIdAndMemberId(costMenuId, memberId);
		recomputeCount(costMenuId);
	}

	/** n_cost_menu_member 재계산 */
	private void recomputeCount(Long costMenuId) {
		long c = costMenuMemberRepository.countByCostMenuId(costMenuId);
		CostMenu menu = costMenuRepository.findById(costMenuId)
			.orElseThrow(() -> new IllegalArgumentException("cost_menu not found: " + costMenuId));
		//menu.setNCostMenuMember((byte)Math.max(0, (int)c));
		costMenuRepository.save(menu);
	}
}
