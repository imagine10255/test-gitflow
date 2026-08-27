export const can = (role, action) => role === 'admin' || action === 'read';
