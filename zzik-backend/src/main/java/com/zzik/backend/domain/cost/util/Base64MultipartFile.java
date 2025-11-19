package com.zzik.backend.domain.cost.util;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import org.springframework.web.multipart.MultipartFile;

/**
 * base64 디코딩된 바이트 배열을 MultipartFile로 변환하기 위한 유틸리티 클래스
 */
public class Base64MultipartFile implements MultipartFile {

	private final byte[] content;
	private final String name;
	private final String originalFilename;
	private final String contentType;

	public Base64MultipartFile(byte[] content, String name, String originalFilename, String contentType) {
		this.content = content;
		this.name = name;
		this.originalFilename = originalFilename;
		this.contentType = contentType;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public String getOriginalFilename() {
		return originalFilename;
	}

	@Override
	public String getContentType() {
		return contentType;
	}

	@Override
	public boolean isEmpty() {
		return content == null || content.length == 0;
	}

	@Override
	public long getSize() {
		return content.length;
	}

	@Override
	public byte[] getBytes() throws IOException {
		return content;
	}

	@Override
	public InputStream getInputStream() throws IOException {
		return new ByteArrayInputStream(content);
	}

	@Override
	public void transferTo(File dest) throws IOException, IllegalStateException {
		try (FileOutputStream fos = new FileOutputStream(dest)) {
			fos.write(content);
		}
	}
}