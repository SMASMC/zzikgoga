package com.zzik.backend.global.external.bank;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.zzik.backend.global.external.bank.dto.BankTransferRequest;
import com.zzik.backend.global.external.bank.dto.BankTransferResponse;
import com.zzik.backend.global.external.bank.exception.BankApiException;
import com.zzik.backend.global.external.bank.exception.BankErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 은행 API 클라이언트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BankApiClient {
	private final RestTemplate restTemplate;

	@Value("${external.bank.base-url}")
	String bankBaseUrl;

	@Value("${external.bank.uris.transfer}")
	String bankTransferUri;

	/**
	 * 계좌 이체 API 호출
	 *
	 * @param request 이체 요청 정보
	 * @return 이체 응답 결과
	 * @throws BankApiException 은행 API 호출 실패 시
	 */
	public BankTransferResponse transfer(BankTransferRequest request) {
		String url = bankBaseUrl + bankTransferUri;

		log.debug("은행 API 호출: {}", url);

		var response = restTemplate.postForObject(url, request, BankTransferResponse.class);
		validateResponse(response);

		log.debug("은행 API 호출 성공");

		return response;
	}

	/**
	 * 응답 코드를 검증하고 에러 시 예외를 발생시킵니다.
	 *
	 * @param response 은행 API 응답
	 * @throws BankApiException 응답이 null이거나 에러 코드인 경우
	 */
	private void validateResponse(BankTransferResponse response) {
		// 1. null 체크
		if (response == null) {
			throw new BankApiException(
				BankErrorCode.GENERAL_ERROR,
				"은행 API 응답이 null입니다."
			);
		}

		// 2. Header null 체크
		if (response.getHeader() == null) {
			throw new BankApiException(
				BankErrorCode.INVALID_HEADER,
				"응답 헤더가 없습니다."
			);
		}

		String responseCode = response.getHeader().getResponseCode();
		String responseMessage = response.getHeader().getResponseMessage();

		log.debug("응답 코드: {}, 메시지: {}", responseCode, responseMessage);

		// 3. 성공 코드(H0000) 체크
		if ("H0000".equals(responseCode)) {
			return; // 정상
		}

		// 4. 에러 코드 매핑
		BankErrorCode errorCode = BankErrorCode.fromCode(responseCode);

		log.error("은행 API 에러 발생: [{}] {} - {}", responseCode, errorCode.getMessage(), responseMessage);

		// 5. 예외 발생
		throw new BankApiException(errorCode, responseMessage);
	}
}
