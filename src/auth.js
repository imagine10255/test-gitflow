export function login(user, pass) {
  if (!user || !pass) throw new Error('missing credentials');
  return { token: `${user}:${pass}`, exp: Date.now() + 3600_000 };
}
