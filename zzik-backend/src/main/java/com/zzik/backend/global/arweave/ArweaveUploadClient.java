package com.zzik.backend.global.arweave;

import java.nio.charset.StandardCharsets;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import com.zzik.backend.domain.nft.dto.JsonUploadResponse;
import com.zzik.backend.domain.nft.dto.PdfUploadResponse;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ArweaveUploadClient {

	private final WebClient uploaderWebClient; // WebClientConfig.java의 baseUrl(http://localhost:4000)

	public record ArweaveUploadResponse(String id, String url) {}

	/** PDF 업로드 (multipart/form-data) */
	public PdfUploadResponse uploadPdf(byte[] pdfBytes, String filename) {

		ByteArrayResource resource = new ByteArrayResource(pdfBytes) {
			@Override
			public String getFilename() {
				return filename;
			}
		};

		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("file", resource);

		return uploaderWebClient.post()
			.uri("/upload/pdf")
			.contentType(MediaType.MULTIPART_FORM_DATA)
			.body(BodyInserters.fromMultipartData(body))
			.retrieve()
			.bodyToMono(PdfUploadResponse.class)
			.block();
	}



	/** metadata.json 업로드 (application/json) */
	public JsonUploadResponse uploadJson(String metadataJson) {
		return uploaderWebClient.post()
			.uri("/upload/json")
			.contentType(MediaType.APPLICATION_JSON)
			.bodyValue(metadataJson.getBytes(StandardCharsets.UTF_8))
			.retrieve()
			.bodyToMono(JsonUploadResponse.class)
			.block();
	}

	/** 잔고/가격/충전도 필요하면 편의 메서드 추가 가능 */
}
