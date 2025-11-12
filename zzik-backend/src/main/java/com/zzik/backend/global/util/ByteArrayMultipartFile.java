package com.zzik.backend.global.util;

import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;

/**
 * byte[] 배열을 S3Service에 전달하기 위해
 * MultipartFile 인터페이스로 래핑하는 헬퍼 클래스
 */
public class ByteArrayMultipartFile implements MultipartFile {

	private final byte[] bytes;
	private final String name;
	private final String originalFilename;
	private final String contentType;

	public ByteArrayMultipartFile(byte[] bytes, String originalFilename, String contentType) {
		this.bytes = bytes;
		this.name = originalFilename;
		this.originalFilename = originalFilename;
		this.contentType = contentType;
	}

	public ByteArrayMultipartFile(byte[] bytes, String name, String originalFilename, String contentType) {
		this.bytes = bytes;
		this.name = originalFilename;
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
		return bytes == null || bytes.length == 0;
	}

	@Override
	public long getSize() {
		return bytes.length;
	}

	@Override
	public byte[] getBytes() throws IOException {
		return bytes;
	}

	@Override
	public InputStream getInputStream() throws IOException {
		return new ByteArrayInputStream(bytes);
	}

	@Override
	public void transferTo(File dest) throws IOException, IllegalStateException {
		try (FileOutputStream fos = new FileOutputStream(dest)) {
			fos.write(bytes);
		}
	}
}
