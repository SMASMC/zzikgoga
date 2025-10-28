// package com.zzik.backend.domain.management.entity;
//
// import com.zzik.backend.domain.auth.entity.Member;
// import com.zzik.backend.domain.management.enums.AttendanceStatus;
// import com.zzik.backend.domain.management.enums.Side;
// import com.zzik.backend.global.base.entity.BaseEntity;
// import jakarta.persistence.*;
// import lombok.AccessLevel;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
//
// import java.time.LocalDateTime;
//
// @Entity
// @Table(name = "guest")
// @Getter
// @NoArgsConstructor(access = AccessLevel.PROTECTED)
// public class Guest extends BaseEntity {
//
// 	@Id
// 	@GeneratedValue(strategy = GenerationType.IDENTITY)
// 	private Long id;
//
// 	@ManyToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "member_id", nullable = false)
// 	private Member member;
//
// 	@ManyToOne(fetch = FetchType.LAZY)
// 	@JoinColumn(name = "wedding_id", nullable = false)
// 	private Wedding wedding;
//
// 	@Column(name = "name", nullable = false, length = 20)
// 	private String name;
//
// 	@Column(name = "relationship", nullable = false, length = 20)
// 	private String relationship;
//
// 	@Enumerated(EnumType.STRING)
// 	@Column(name = "side", nullable = false)
// 	private Side side;
//
// 	@Enumerated(EnumType.STRING)
// 	@Column(name = "attendance_status")
// 	private AttendanceStatus attendanceStatus;
//
// 	@Column(name = "login_token", nullable = false, length = 100)
// 	private String loginToken;
//
// 	@Column(name = "responded_at")
// 	private LocalDateTime respondedAt;
//
// 	@Column(name = "attendee_count", nullable = false)
// 	private Integer attendeeCount;
// }
