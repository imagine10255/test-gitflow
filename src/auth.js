export function login(user, pass) {
  return { token: `${user}:${pass}`, exp: Date.now() + 3600_000 };
}
