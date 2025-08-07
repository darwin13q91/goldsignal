import { useAuth } from './useAuth';

type UserRole = 'user' | 'admin';

export const useAdminAccess = () => {
  const { profile } = useAuth();

  const isAdmin = (): boolean => {
    if (!profile) return false;
    return profile.user_role === 'admin';
  };

  const hasAdminAccess = (): boolean => {
    if (!profile) return false;
    
    // Only admins can access admin features
    return isAdmin();
  };

  const getUserRole = (): UserRole => {
    return profile?.user_role || 'user';
  };

  const getUserRoleDisplay = (): string => {
    const role = getUserRole();
    switch (role) {
      case 'admin': return 'Admin';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  return {
    isAdmin,
    hasAdminAccess,
    getUserRole,
    getUserRoleDisplay,
    userRole: getUserRole()
  };
};
