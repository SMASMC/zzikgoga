package com.zzik.backend.domain.wallet.service; // (패키지는 적절히 변경하세요)

import com.zzik.backend.global.exception.BusinessException;
import com.zzik.backend.global.exception.ExceptionCode;
import java.security.InvalidAlgorithmParameterException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.ECKeyPair;
import org.web3j.crypto.Keys;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

	private final TextEncryptor textEncryptor;

	/**
	 * 지갑 생성 결과 DTO (Java 17+ Record 사용)
	 */
	public record WalletCreationResult(String address, String encryptedPrivateKey) {
	}

	/**
	 * 새로운 Polygon 지갑을 생성하고 개인키를 암호화합니다.
	 *
	 * @return WalletCreationResult (지갑 주소, 암호화된 개인키)
	 */
	public WalletCreationResult createWallet() {
		try {
			// 1. web3j를 사용하여 새 키 쌍(ECKeyPair) 생성
			ECKeyPair ecKeyPair = Keys.createEcKeyPair();

			// 2. 개인키(hex)와 주소 추출
			String privateKey = ecKeyPair.getPrivateKey().toString(16);
			String address = "0x" + Keys.getAddress(ecKeyPair);

			// 3. 개인키 암호화 (중요!)
			String encryptedPrivateKey = textEncryptor.encrypt(privateKey);

			return new WalletCreationResult(address, encryptedPrivateKey);

		} catch (InvalidAlgorithmParameterException | NoSuchAlgorithmException | NoSuchProviderException e) {
			log.error("Failed to create wallet key pair", e);
			// TODO: ExceptionCode에 WALLET_CREATION_FAILED 추가 필요
			throw BusinessException.from(ExceptionCode.WALLET_CREATION_FAILED);
		}
	}

	/**
	 * (참고) 나중에 개인키를 복호화하여 사용할 때
	 */
	public String decryptPrivateKey(String encryptedPrivateKey) {
		try {
			return textEncryptor.decrypt(encryptedPrivateKey);
		} catch (Exception e) {
			log.error("Failed to decrypt private key", e);
			// TODO: ExceptionCode에 WALLET_DECRYPTION_FAILED 추가 필요
			throw BusinessException.from(ExceptionCode.WALLET_DECRYPTION_FAILED);
		}
	}

	/**
	 * 저장된 주소와 암호화된 개인키가 수학적으로 일치하는지 검증합니다.
	 *
	 * @param storedAddress       DB에 저장된 지갑 주소 (member.getWalletAddress())
	 * @param encryptedPrivateKey DB에 저장된 암호화된 키 (member.getWalletPrivateKey())
	 * @return 일치하면 true, 아니면 false
	 */
	public boolean verifyWallet(String storedAddress, String encryptedPrivateKey) {
		if (storedAddress == null || storedAddress.isEmpty() ||
			encryptedPrivateKey == null || encryptedPrivateKey.isEmpty()) {
			return false;
		}

		try {
			// 1. 개인키를 복호화합니다.
			String decryptedPrivateKey = decryptPrivateKey(encryptedPrivateKey);

			// 2. web3j의 Credentials 객체를 복호화된 키로 생성합니다.
			Credentials credentials = Credentials.create(decryptedPrivateKey);

			// 3. Credentials 객체에서 주소를 유도해냅니다.
			String derivedAddress = credentials.getAddress();

			// 4. 저장된 주소와 유도된 주소를 (대소문자 무시하고) 비교합니다.
			//    (이더리움 주소는 체크섬 여부에 따라 대소문자가 다를 수 있으므로
			//     equalsIgnoreCase로 비교하는 것이 안전합니다.)
			boolean matches = storedAddress.equalsIgnoreCase(derivedAddress);

			if (matches) {
				log.info("✅ 지갑 검증 성공: {} == {}", storedAddress, derivedAddress);
			} else {
				log.info("🚨 지갑 검증 실패: DB 주소 {} != 유도된 주소 {}", storedAddress, derivedAddress);
			}
			return matches;

		} catch (Exception e) {
			log.error("지갑 검증 중 오류 발생", e);
			return false;
		}
	}
}
