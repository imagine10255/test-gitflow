// 1
// 2
// 3
// 4
// 2.1
// 2.1-beta.1
export function record(action, user) {
  return { action, user: user ?? 'anonymous', at: new Date().toISOString() };
}
