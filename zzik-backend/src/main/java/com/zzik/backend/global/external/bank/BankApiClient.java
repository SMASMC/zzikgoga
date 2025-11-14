package com.zzik.backend.global.external.bank;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.zzik.backend.global.external.bank.dto.BankTransferRequest;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class BankApiClient {
	RestTemplate restTemplate;

	@Value("${external.bank.base-url}")
	String bankBaseUrl;

	@Value("${external.bank.uris.transfer}")
	String bankTransferUri;

	public void transfer(BankTransferRequest request) {
		//TODO
	}
}
