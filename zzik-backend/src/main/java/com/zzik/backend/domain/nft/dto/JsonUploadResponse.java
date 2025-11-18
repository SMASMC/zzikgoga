package com.zzik.backend.domain.nft.dto;

public record JsonUploadResponse(
	Boolean ok,
	String metadataId,
	String metadataUrl,
	String tokenURI
) {}
