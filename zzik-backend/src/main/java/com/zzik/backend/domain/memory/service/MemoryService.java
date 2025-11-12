package com.zzik.backend.domain.memory.service;

import com.zzik.backend.domain.auth.entity.Member;
import com.zzik.backend.domain.auth.repository.MemberRepository;
import com.zzik.backend.domain.memory.dto.request.MemorySaveRequest;
import com.zzik.backend.domain.memory.dto.response.MemoryDetailResponse;
import com.zzik.backend.domain.memory.dto.response.MemoryPdfResponse;
import com.zzik.backend.domain.memory.entity.Memory;
import com.zzik.backend.domain.memory.enums.MintStatus;
import com.zzik.backend.domain.memory.enums.StorageType;
import com.zzik.backend.domain.memory.repository.MemoryRepository;
import com.zzik.backend.domain.plan.entity.Trip;
import com.zzik.backend.domain.plan.repository.TripMemberRepository;
import com.zzik.backend.domain.plan.repository.TripRepository;
import com.zzik.backend.global.cloud.s3.service.S3Directory;
import com.zzik.backend.global.cloud.s3.service.S3Service;
import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.util.ByteArrayMultipartFile;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import java.net.URL;
import java.util.Base64;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
@RequiredArgsConstructor
public class MemoryService {

	private final MemoryRepository memoryRepository;
	private final MemberRepository memberRepository;
	private final TripRepository tripRepository;
	private final TripMemberRepository tripMemberRepository;
	private final S3Service s3Service;

	/**
	 * 1. 여행 기록 저장 (Upsert: Create or Update)
	 */
	public MemoryDetailResponse saveMemory(Long tripId, Long memberId, MemorySaveRequest request) {

		System.out.println("Received JSON content: {}"+ request.content());
		// 1. 권한 검사 (여행 멤버인지)
		checkTripMembership(tripId, memberId);

		// 2. 기존 기록 조회
		Optional<Memory> existingMemory = memoryRepository.findByTripIdAndMemberId(tripId, memberId);

		Memory memory;
		if (existingMemory.isPresent()) {
			// [Update]
			memory = existingMemory.get();
			memory.update(request.title(), request.content(), request.status());
		} else {
			// [Create]
			// 엔티티 조회 (생성에만 필요)
			Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));
			Trip trip = tripRepository.findById(tripId)
				.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

			memory = Memory.builder()
				.member(member)
				.trip(trip)
				.title(request.title())
				.content(request.content())
				.status(request.status())
				.mintStatus(MintStatus.none)
				.build();
		}

		// 3. 저장 (Create 또는 Update)
		Memory savedMemory = memoryRepository.save(memory);

		// 4. 저장된 상세 정보로 DTO 반환
		// (주의: Fetch Join을 쓰지 않았으므로, from 메서드가 지연 로딩을 트리거할 수 있음)
		// (성능이 중요하다면, 저장 후 다시 findWithDetailsFetch로 조회해야 함)
		// 여기서는 간단하게 DTO 변환
		return MemoryDetailResponse.from(savedMemory);
	}

	/**
	 * 2. 나의 여행 기록 상세 조회
	 */
	@Transactional(readOnly = true)
	public MemoryDetailResponse getMyMemory(Long tripId, Long memberId) {

		// 1. 권한 검사 (여행 멤버인지)
		checkTripMembership(tripId, memberId);

		// 2. 데이터 조회 (N+1 방지 Fetch Join)
		Memory memory = memoryRepository.findByTripIdAndMemberIdWithDetailsFetch(tripId, memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		// 3. DTO 변환 및 반환
		return MemoryDetailResponse.from(memory);
	}


	/**
	 * 3. 여행 기록 PDF 변환
	 */
	public MemoryPdfResponse convertMemoryToPdf(Long tripId, Long memberId) {

		// 1. DB에서 내 기록 조회 (권한 확인 포함)
		checkTripMembership(tripId, memberId);
		Memory memory = memoryRepository.findByTripIdAndMemberIdWithDetailsFetch(tripId, memberId)
			.orElseThrow(() -> BusinessException.from(ExceptionCode.NOT_FOUND_RESOURCE));

		try {
			// 2. Memory 엔티티(JSONB)를 HTML 문자열로 변환
			String htmlContent = convertBlocksToHtml(memory);

			// 3. HTML 문자열을 PDF (byte[])로 변환
			byte[] pdfBytes = generatePdfFromHtml(htmlContent);

			// 4. byte[]를 MultipartFile 래퍼로 생성
			String filename = "memory-" + memory.getId() + "-" + memberId + ".pdf";
			MultipartFile pdfMultipartFile = new ByteArrayMultipartFile(
				pdfBytes,
				filename,
				MediaType.APPLICATION_PDF_VALUE
			);

			// 5. 제공된 S3Service를 사용하여 업로드 (Object Key 반환)
			String objectKey = s3Service.uploadFile(
				pdfMultipartFile,
				S3Directory.MEMORY_PDF
			);

			// 6. DB에 S3 Object Key 및 상태 업데이트 (전체 URL이 아님!)
			memory.setPdfStorageInfo(objectKey, StorageType.s3);

			// 7. S3Service를 사용하여 Presigned URL 생성 (응답용)
			String presignedUrl = s3Service.getPresignedUrl(objectKey);

			// 8. 응답 DTO 반환
			return new MemoryPdfResponse(memory.getId(), presignedUrl, StorageType.s3.name());

		} catch (Exception e) {
			throw BusinessException.from(ExceptionCode.FILE_UPLOAD_FAILED);
		}
	}

	// --- PDF 변환 헬퍼 메서드 ---

	/**
	 * [Helper] Memory 엔티티의 JSONB(Map)를 HTML 문자열로 변환
	 */
	private String convertBlocksToHtml(Memory memory) {
		StringBuilder html = new StringBuilder();
		html.append("<html><head><style>");
		// 폰트 이름은 'NanumGothic' (아래 폰트 등록 이름과 일치)
		html.append("body { font-family: 'NanumGothic', sans-serif; margin: 40px; }");
		html.append("h1 { font-size: 2.0em; font-weight: bold; }");
		html.append("h2 { font-size: 1.5em; font-weight: bold; }");
		html.append("h3 { font-size: 1.2em; font-weight: bold; }");
		html.append("p { font-size: 1.0em; line-height: 1.6; min-height: 1.2em; }"); // 👈 빈 <p>태그 높이
		html.append("img { max-width: 75%; height: auto; margin-top: 10px; }");
		html.append("hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }");
		html.append("</style></head><body>");

		// 1. 제목
		html.append("<h1>").append(escapeHtml(memory.getTitle())).append("</h1>");
		html.append("<hr />"); // 제목과 본문 구분선

		// 2. 본문 (JSONB)
		Map<String, Object> contentMap = memory.getContent();
		if (contentMap != null && contentMap.containsKey("blocks")) {
			List<Map<String, Object>> blocks = (List<Map<String, Object>>) contentMap.get("blocks");

			for (Map<String, Object> block : blocks) {
				String type = (String) block.get("type");
				Map<String, Object> data = (Map<String, Object>) block.get("data");
				if (data == null) continue;

				switch (type) {
					case "heading1":
						html.append("<h1>").append(escapeHtml((String) data.get("text"))).append("</h1>");
						break;
					case "heading2":
						html.append("<h2>").append(escapeHtml((String) data.get("text"))).append("</h2>");
						break;
					case "heading3":
						html.append("<h3>").append(escapeHtml((String) data.get("text"))).append("</h3>");
						break;
					case "paragraph":
						String text = (String) data.get("text");
						html.append("<p>");
						if (text != null && !text.isEmpty()) {
							html.append(escapeHtml(text));
						} else {
							html.append("&#160;"); // 비어있는 p태그도 높이
						}
						html.append("</p>");
						break;
					case "image":
						String url = (String) data.get("url");
						String caption = (String) data.get("caption");
						String imageSrc = url;
						if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
							try {
								imageSrc = processImageForPdf(url);
							} catch (Exception e) {
								imageSrc = url;
							}
						}
						html.append("<div style='text-align: center;'>");
						if(imageSrc != null) html.append("<img src=\"").append(imageSrc).append("\" />");
						if (caption != null && !caption.isEmpty()) {
							html.append("<p style='text-align:center; font-style:italic;'>")
								.append(escapeHtml(caption))
								.append("</p>");
						}
						html.append("</div>");
						break;
					// TODO: "list", "quote" 등 타입 추가
				}
			}
		}
		html.append("</body></html>");
		return html.toString();
	}

	/**
	 * [Helper] HTML을 PDF byte[]로 변환 (한글 폰트 적용)
	 */
	private byte[] generatePdfFromHtml(String html) throws Exception {
		try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
			PdfRendererBuilder builder = new PdfRendererBuilder();

			// src/main/resources/fonts/NanumGothic.ttf
			// ClassPathResource를 사용하여 리소스 경로에서 폰트 로드
			builder.useFont(
				() -> {
					try {
						return new ClassPathResource("fonts/NanumGothic.ttf").getInputStream();
					} catch (IOException e) {
						throw new RuntimeException(e);
					}
				},
				"NanumGothic" // 👈 CSS에서 사용할 폰트 이름
			);

			builder.withHtmlContent(html, null);
			builder.toStream(os);
			builder.run();
			return os.toByteArray();
		}
	}

	/**
	 * [Helper] XSS 방지를 위한 간단한 HTML Escape
	 */
	private String escapeHtml(String text) {
		if (text == null) return "";
		// (간단한 XSS 방지. <b> 등을 허용하려면 라이브러리 필요)
		return text.replace("&", "&amp;")
			.replace("<", "&lt;")
			.replace(">", "&gt;");
	}

	/**
	 * [Helper] 사용자가 해당 여행의 멤버인지 확인
	 */
	private void checkTripMembership(Long tripId, Long memberId) {
		if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
			throw BusinessException.from(ExceptionCode.FORBIDDEN);
		}
	}

	/**
	 * [Helper] S3의 이미지 URL(WebP)을 다운로드하여
	 * PDF 호환 포맷(JPEG)으로 변환 후 Base64로 인코딩
	 */
	private String processImageForPdf(String imageUrl) throws Exception {
		URL url = new URL(imageUrl);

		// 1. S3에서 이미지 다운로드 및 디코딩
		// (build.gradle에 'webp-imageio' 의존성이 있으므로
		// ImageIO.read가 WebP URL을 인식하고 BufferedImage로 만듦)
		BufferedImage image = ImageIO.read(url);

		if (image == null) {
			throw new IOException("Could not read image from URL: " + imageUrl);
		}

		// 2. 이미지를 PDF가 지원하는 'JPEG' 포맷으로 메모리상에서 변환
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(image, "jpeg", baos); // 👈 "jpeg" 또는 "png"
		byte[] processedImageBytes = baos.toByteArray();

		// 3. Base64로 인코딩하여 Data-URI 스킴으로 반환
		String base64Image = Base64.getEncoder().encodeToString(processedImageBytes);
		return "data:image/jpeg;base64," + base64Image;
	}
}
