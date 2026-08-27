export function refresh(token) {
  if (!token) return null;
  return { token, exp: Date.now() + 3600_000 };
}
