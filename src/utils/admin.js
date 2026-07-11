export const ADMIN_UID = 'PPe2ja8SlPRwmx1pLvnihWKhtqa2';

export function isAdminUser(user) {
  return user?.uid === ADMIN_UID;
}
