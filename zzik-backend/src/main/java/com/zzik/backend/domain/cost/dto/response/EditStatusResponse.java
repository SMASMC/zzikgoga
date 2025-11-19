package com.zzik.backend.domain.cost.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EditStatusResponse {
	private Long costId;
	private boolean isEditing;
	private EditingMember editingMember;
	private String editStartedAt;
	private boolean canEdit;
}
