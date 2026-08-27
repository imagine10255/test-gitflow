export function record(action, user) {
  return { action, user, at: new Date().toISOString() };
}
