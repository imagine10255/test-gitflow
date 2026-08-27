export function refresh(token) {
  return { token, exp: Date.now() + 3600_000 };
}
