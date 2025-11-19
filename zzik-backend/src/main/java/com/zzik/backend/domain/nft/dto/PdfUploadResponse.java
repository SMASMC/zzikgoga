package com.zzik.backend.domain.nft.dto;

public record PdfUploadResponse(
	Boolean ok,
	String pdfId,
	String pdfUrl,
	String thumbnailId,
	String thumbnailUrl
) {}
