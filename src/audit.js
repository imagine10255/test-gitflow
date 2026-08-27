export function record(action, user) {
  return { action, user: user ?? 'anonymous', at: new Date().toISOString() };
}
