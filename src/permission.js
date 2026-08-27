export const can = (role, action) => {
  if (!role) return false;
  return role === 'admin' || action === 'read';
};
