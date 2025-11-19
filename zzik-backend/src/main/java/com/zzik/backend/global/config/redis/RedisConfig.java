package com.zzik.backend.global.config.redis;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.repository.configuration.EnableRedisRepositories;

@Configuration
@EnableRedisRepositories(basePackages = "com.zzik.backend.infra.redis")
public class RedisConfig {
}
