// 1
// 2
// 3
export function record(action, user) {
  return { action, user: user ?? 'anonymous', at: new Date().toISOString() };
}
