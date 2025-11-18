// src/main/java/com/zzik/backend/domain/cost/controller/CostController.java
package com.zzik.backend.domain.cost.controller;

import java.util.Base64;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zzik.backend.domain.cost.api.CostApi;
import com.zzik.backend.domain.cost.dto.request.SaveCostRequest;
import com.zzik.backend.domain.cost.dto.response.CostCalculateResponse;
import com.zzik.backend.domain.cost.dto.response.CostDeleteResponse;
import com.zzik.backend.domain.cost.dto.response.CostItemDetailResponse;
import com.zzik.backend.domain.cost.dto.response.CostListResponse;
import com.zzik.backend.domain.cost.dto.response.ReceiptOcrResponse;
import com.zzik.backend.domain.cost.service.CostCalculateService;
import com.zzik.backend.domain.cost.service.CostService;
import com.zzik.backend.domain.cost.util.Base64MultipartFile;
import com.zzik.backend.domain.user.service.UserService;
import com.zzik.backend.global.cloud.s3.service.S3Directory;
import com.zzik.backend.global.cloud.s3.service.S3Service;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import com.zzik.backend.global.security.utils.SecurityUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/cost")
public class CostController implements CostApi {

	private final CostService costService;
	private final CostCalculateService costCalculateService;
	private final UserService userService;
	private final S3Service s3Service;

	@Override
	public ResponseEntity<ApiResponse<ReceiptOcrResponse>> uploadReceiptAndSave(
		@PathVariable Long tripId,
		@RequestPart("file") MultipartFile file
	) {
		ReceiptOcrResponse result = costService.ocrAndCreate(tripId, file);
		return ResponseEntity.ok(ApiResponse.createSuccess(result));
	}

	// 정산 직접 입력
	@Override
	public ResponseEntity<ApiResponse<Map<String, Long>>> createCost(
		@PathVariable Long tripId,
		@RequestBody SaveCostRequest request
	) {
		// receiptJson(base64 이미지)을 S3에 업로드하고 objectKey 받기
		String s3ObjectKey = uploadBase64ImageToS3(request.getReceiptJson());

		// Cost 생성
		Long id = costService.createCost(tripId, request, s3ObjectKey);
		Map<String, Long> content = Map.of("costId", id);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}

	/**
	 * base64로 인코딩된 이미지를 S3에 업로드하고 objectKey를 반환합니다.
	 *
	 * @param base64Image base64로 인코딩된 이미지 문자열 (Data URL 형식 또는 순수 base64)
	 * @return S3 object key (업로드된 파일의 키), base64가 null이거나 빈 문자열이면 null 반환
	 */
	private String uploadBase64ImageToS3(String base64Image) {
		if (base64Image == null || base64Image.isBlank()) {
			return null;
		}

		try {
			String base64Data = base64Image;
			String mimeType = "image/jpeg"; // 기본값

			// Data URL 형식인 경우 (예: data:image/png;base64,...)
			if (base64Image.startsWith("data:")) {
				int commaIndex = base64Image.indexOf(',');
				if (commaIndex > 0) {
					String dataUrlPrefix = base64Image.substring(0, commaIndex);
					base64Data = base64Image.substring(commaIndex + 1);

					// MIME type 추출
					if (dataUrlPrefix.contains("image/")) {
						int mimeStart = dataUrlPrefix.indexOf("image/");
						int mimeEnd = dataUrlPrefix.indexOf(';', mimeStart);
						if (mimeEnd > mimeStart) {
							mimeType = dataUrlPrefix.substring(mimeStart, mimeEnd);
						}
					}
				}
			}

			// base64 디코딩하여 바이트 배열로 변환
			byte[] imageBytes = Base64.getDecoder().decode(base64Data);

			// 바이트 시그니처로 이미지 형식 검증 및 MIME type 보정
			String detectedMimeType = detectImageMimeType(imageBytes);
			if (detectedMimeType != null) {
				mimeType = detectedMimeType;
			}

			// 확장자 결정
			String extension = getExtensionFromMimeType(mimeType);

			// MultipartFile로 변환
			MultipartFile file = new Base64MultipartFile(
				imageBytes,
				"receipt",
				"receipt_" + System.currentTimeMillis() + extension,
				mimeType
			);

			// S3에 업로드하고 objectKey 반환
			String objectKey = s3Service.uploadFile(file, S3Directory.RECEIPT);
			log.debug("직접 정산 추가 Successfully uploaded base64 image to S3: {}, mimeType: {}", objectKey, mimeType);
			return objectKey;

		} catch (IllegalArgumentException e) {
			log.error("Invalid base64 string", e);
			throw BusinessException.from(ExceptionCode.UNSUPPORTED_IMAGE_TYPE);
		} catch (Exception e) {
			log.error("Failed to upload base64 image to S3", e);
			throw BusinessException.from(ExceptionCode.S3_UPLOAD_FAILED);
		}
	}

	/**
	 * 바이트 배열의 시그니처(Magic Bytes)를 확인하여 이미지 MIME type을 감지합니다.
	 *
	 * @param imageBytes 이미지 바이트 배열
	 * @return 감지된 MIME type, 알 수 없는 경우 null
	 */
	private String detectImageMimeType(byte[] imageBytes) {
		if (imageBytes == null || imageBytes.length < 4) {
			return null;
		}

		// JPEG: FF D8 FF
		if (imageBytes[0] == (byte)0xFF && imageBytes[1] == (byte)0xD8 && imageBytes[2] == (byte)0xFF) {
			return "image/jpeg";
		}

		// PNG: 89 50 4E 47
		if (imageBytes[0] == (byte)0x89 && imageBytes[1] == (byte)0x50 &&
			imageBytes[2] == (byte)0x4E && imageBytes[3] == (byte)0x47) {
			return "image/png";
		}

		// GIF: 47 49 46 38
		if (imageBytes[0] == (byte)0x47 && imageBytes[1] == (byte)0x49 &&
			imageBytes[2] == (byte)0x46 && imageBytes[3] == (byte)0x38) {
			return "image/gif";
		}

		// WebP: RIFF ... WEBP
		if (imageBytes.length >= 12 &&
			imageBytes[0] == (byte)0x52 && imageBytes[1] == (byte)0x49 &&
			imageBytes[2] == (byte)0x46 && imageBytes[3] == (byte)0x46 &&
			imageBytes[8] == (byte)0x57 && imageBytes[9] == (byte)0x45 &&
			imageBytes[10] == (byte)0x42 && imageBytes[11] == (byte)0x50) {
			return "image/webp";
		}

		return null;
	}

	/**
	 * MIME type으로부터 파일 확장자를 반환합니다.
	 *
	 * @param mimeType MIME type
	 * @return 파일 확장자 (점 포함)
	 */
	private String getExtensionFromMimeType(String mimeType) {
		if (mimeType == null) {
			return ".jpg";
		}

		return switch (mimeType) {
			case "image/jpeg", "image/jpg" -> ".jpg";
			case "image/png" -> ".png";
			case "image/gif" -> ".gif";
			case "image/webp" -> ".webp";
			default -> ".jpg";
		};
	}

	@Override
	public ResponseEntity<ApiResponse<CostListResponse>> getCostList(Long tripId) {
		CostListResponse response = costService.readCostList(tripId);
		return ResponseEntity.ok(ApiResponse.createSuccess(response));
	}

	@Override
	public ResponseEntity<ApiResponse<CostItemDetailResponse>> getCostDetail(
		@PathVariable Long tripId,
		@PathVariable Long costId
	) {
		CostItemDetailResponse detail = costService.getCostDetail(tripId, costId);
		return ResponseEntity.ok(ApiResponse.createSuccess(detail));
	}

	@Override
	public ResponseEntity<ApiResponse<CostCalculateResponse>> calculate(Long tripId) {
		Long userId = SecurityUtil.getCurrentMemberId();
		CostCalculateResponse content = costCalculateService.calculate(tripId, userId);
		return ResponseEntity.ok(ApiResponse.createSuccess(content));
	}

	@Override
	public ResponseEntity<ApiResponse<CostDeleteResponse>> deleteCost(
		@PathVariable Long tripId,
		@PathVariable Long costId
	) {
		Long deletedId = costService.deleteCost(tripId, costId);
		return ResponseEntity.ok(ApiResponse.createSuccess(new CostDeleteResponse(deletedId)));
	}
}
