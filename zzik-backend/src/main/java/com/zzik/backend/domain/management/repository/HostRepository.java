package com.zzik.backend.domain.management.repository;

import com.zzik.backend.domain.management.entity.Host;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HostRepository extends JpaRepository<Host, Long> {
	boolean existsBySpouseCode(String spouseCode);
}
