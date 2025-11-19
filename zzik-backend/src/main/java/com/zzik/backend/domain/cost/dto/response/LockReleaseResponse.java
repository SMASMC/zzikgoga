package com.zzik.backend.domain.cost.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class LockReleaseResponse {
    private Long costId;
    private boolean released;
}

