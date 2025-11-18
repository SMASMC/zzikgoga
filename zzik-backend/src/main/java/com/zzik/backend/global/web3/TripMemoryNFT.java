package com.zzik.backend.global.web3;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.gas.StaticGasProvider;

public class TripMemoryNFT extends Contract {

	protected TripMemoryNFT(
		String contractAddress,
		Web3j web3j,
		RawTransactionManager transactionManager,
		StaticGasProvider gasProvider
	) {
		super("", contractAddress, web3j, transactionManager, gasProvider);
	}

	public static TripMemoryNFT load(
		String contractAddress,
		Web3j web3j,
		RawTransactionManager transactionManager,
		StaticGasProvider gasProvider
	) {
		return new TripMemoryNFT(contractAddress, web3j, transactionManager, gasProvider);
	}

	/**
	 * mintForGroup(address[] recipients, string tokenURI)
	 */
	public TransactionReceipt mintForGroup(
		String tripId,
		List<String> recipients,
		String metadataURI
	) throws Exception {

		DynamicArray<Address> addresses = new DynamicArray<>(
			Address.class,
			recipients.stream().map(Address::new).toList()
		);

		Function function = new Function(
			"mintForGroup",
			Arrays.asList(
				new Utf8String(tripId),   // 첫 번째 파라미터
				addresses,                // 두 번째 파라미터
				new Utf8String(metadataURI) // 세 번째 파라미터
			),
			Collections.emptyList()
		);

		return executeTransaction(function);
	}

	/**
	 * executeTransaction(Function) 은 부모 Contract 클래스에 이미 있음
	 * protected 로 override 가능 (필요 없으니 override 하지 않음)
	 */

	public RemoteFunctionCall<Boolean> ownsTripToken(String ownerAddress, String tripId) {
		Function function = new Function(
			"ownsTripToken",
			Arrays.asList(
				new Address(ownerAddress),
				new Utf8String(tripId)
			),
			Arrays.asList(new TypeReference<org.web3j.abi.datatypes.Bool>() {})
		);
		return executeRemoteCallSingleValueReturn(function, Boolean.class);
	}
}
