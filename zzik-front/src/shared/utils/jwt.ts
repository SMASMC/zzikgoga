// src/shared/utils/jwt.ts

export function isJWTExpired(token: string): boolean {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (err) {
    console.error('JWT 파싱 실패:', err);
    return true; // 실패 시 만료된 것으로 처리
  }
}
