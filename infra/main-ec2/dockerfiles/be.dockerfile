# --- Runtime-only Dockerfile (use prebuilt JAR from build/libs) ---
FROM eclipse-temurin:21-jre-alpine
# Locale / Timezone / Healthcheck tools
RUN apk add --no-cache tzdata curl \
 && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
 && echo "Asia/Seoul" > /etc/timezone \
 && addgroup -S spring && adduser -S spring -G spring

WORKDIR /app
USER spring:spring

COPY --chown=spring:spring build/libs/*.jar /app/app.jar

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0" \
    SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]