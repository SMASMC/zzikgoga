package com.zzik.backend.domain.cost.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zzik.backend.domain.cost.config.ClovaOcrProperties;
import com.zzik.backend.domain.cost.dto.response.ReceiptItemDto;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostService {

	private final ClovaOcrProperties props;
	private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	private final ObjectMapper objectMapper = new ObjectMapper();
	private final RestTemplate restTemplate = new RestTemplate();

	public void validateReceiptImage(MultipartFile file) {
		if (file.getSize() > MAX_FILE_SIZE) {
			throw BusinessException.from(ExceptionCode.INVALID_UPLOAD_SIZE);
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
				throw BusinessException.from(ExceptionCode.RECEIPT_RECOGNIZE_FAIL);
			}

			JsonNode root = objectMapper.readTree(resp.getBody());
			return toResponse(tripId, root);

		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			throw BusinessException.from(ExceptionCode.RECEIPT_RECOGNIZE_FAIL);
		}
	}

	private ReceiptOcrResponse toResponse(Long tripId, JsonNode root) {
		JsonNode image0 = root.path("images").path(0);
		String inferResult = image0.path("inferResult").asText();
		JsonNode result = image0.path("receipt").path("result");

		// store
		String store = text(result, "storeInfo", "name", "text");
		String subStore = text(result, "storeInfo", "subName", "text");
		if (StringUtils.hasText(subStore))
			store = store + " " + subStore;

		// date
		String date = text(result, "paymentInfo", "date", "text");

		// card
		String cardCompany = text(result, "paymentInfo", "cardInfo", "company", "text");
		String cardNumber = text(result, "paymentInfo", "cardInfo", "number", "text");
		String installment = text(result, "paymentInfo", "cardInfo", "installmentPlanMonths", "text");
		String approval = text(result, "paymentInfo", "confirmNum", "text");

		// items
		List<ReceiptItemDto> items = new ArrayList<>();
		JsonNode subResults = result.path("subResults");
		if (subResults.isArray()) {
			for (JsonNode sr : subResults) {
				JsonNode srItems = sr.path("items");
				if (srItems.isArray()) {
					for (JsonNode it : srItems) {
						String name = text(it, "name", "text");
						String count = text(it, "count", "text");
						String price = text(it, "price", "price", "text");
						items.add(new ReceiptItemDto(name, count, price));
					}
				}
			}
		}

		String total = text(result, "totalPrice", "price", "text");
		String resultPrice = text(result, "resultPrice", "price", "text");
		if (!StringUtils.hasText(resultPrice))
			resultPrice = total;

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
		// formatted.value 존재 시 우선 사용
		String formatted = cur.path("formatted").path("value").asText(null);
		if (formatted != null)
			return formatted;
		return cur.asText("");
	}

	private String getExt(String name) {
		if (!StringUtils.hasText(name) || !name.contains("."))
			return "jpg";
		return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
	}
}
