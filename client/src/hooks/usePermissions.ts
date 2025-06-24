import { useAuth } from './useAuth';

// Permission definitions (client-side)
export const PERMISSIONS = {
  // Target Management
  TARGET_CREATE: 'target:create',
  TARGET_ASSIGN: 'target:assign',
  TARGET_EDIT: 'target:edit',
  TARGET_VIEW: 'target:view',
  TARGET_TRACK: 'target:track',
  TARGET_DELETE: 'target:delete',

  // Lead Management
  LEAD_CREATE: 'lead:create',
  LEAD_ASSIGN: 'lead:assign',
  LEAD_EDIT: 'lead:edit',
  LEAD_VIEW: 'lead:view',
  LEAD_DELETE: 'lead:delete',
  LEAD_IMPORT: 'lead:import',
  LEAD_EXPORT: 'lead:export',

  // Pipeline and Activity
  PIPELINE_CONFIG: 'pipeline:config',
  PIPELINE_VIEW: 'pipeline:view',
  PIPELINE_EDIT: 'pipeline:edit',
  ACTIVITY_CREATE: 'activity:create',
  ACTIVITY_VIEW: 'activity:view',
  ACTIVITY_EDIT: 'activity:edit',

  // Analytics
  ANALYTICS_GLOBAL: 'analytics:global',
  ANALYTICS_TEAM: 'analytics:team',
  ANALYTICS_PERSONAL: 'analytics:personal',

  // Calendar
  CALENDAR_CREATE: 'calendar:create',
  CALENDAR_ASSIGN: 'calendar:assign',
  CALENDAR_VIEW: 'calendar:view',
  CALENDAR_EDIT: 'calendar:edit',
  CALENDAR_SYNC: 'calendar:sync',

  // User Management
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_VIEW: 'user:view',
  USER_ASSIGN_ROLE: 'user:assign_role',
  USER_DEACTIVATE: 'user:deactivate',
  USER_VIEW_TEAM: 'user:view_team',
  USER_EDIT_SELF: 'user:edit_self'
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_AGENT: 'sales_agent'
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
type Role = typeof ROLES[keyof typeof ROLES];

// Role-based permission mapping (client-side)
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: [
    // All permissions
    PERMISSIONS.TARGET_CREATE, PERMISSIONS.TARGET_ASSIGN, PERMISSIONS.TARGET_EDIT, 
    PERMISSIONS.TARGET_VIEW, PERMISSIONS.TARGET_TRACK, PERMISSIONS.TARGET_DELETE,
    PERMISSIONS.LEAD_CREATE, PERMISSIONS.LEAD_ASSIGN, PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_VIEW, PERMISSIONS.LEAD_DELETE, PERMISSIONS.LEAD_IMPORT, PERMISSIONS.LEAD_EXPORT,
    PERMISSIONS.PIPELINE_CONFIG, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.PIPELINE_EDIT,
    PERMISSIONS.ACTIVITY_CREATE, PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.ACTIVITY_EDIT,
    PERMISSIONS.ANALYTICS_GLOBAL, PERMISSIONS.ANALYTICS_TEAM, PERMISSIONS.ANALYTICS_PERSONAL,
    PERMISSIONS.CALENDAR_CREATE, PERMISSIONS.CALENDAR_ASSIGN, PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT, PERMISSIONS.CALENDAR_SYNC,
    PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_ASSIGN_ROLE, PERMISSIONS.USER_DEACTIVATE, PERMISSIONS.USER_VIEW_TEAM,
    PERMISSIONS.USER_EDIT_SELF
  ],

  [ROLES.SALES_MANAGER]: [
    // Team-level permissions
    PERMISSIONS.TARGET_CREATE, PERMISSIONS.TARGET_ASSIGN, PERMISSIONS.TARGET_EDIT,
    PERMISSIONS.TARGET_VIEW, PERMISSIONS.TARGET_TRACK,
    PERMISSIONS.LEAD_CREATE, PERMISSIONS.LEAD_ASSIGN, PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_VIEW, PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.PIPELINE_EDIT,
    PERMISSIONS.ACTIVITY_CREATE, PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.ACTIVITY_EDIT,
    PERMISSIONS.ANALYTICS_TEAM, PERMISSIONS.ANALYTICS_PERSONAL,
    PERMISSIONS.CALENDAR_CREATE, PERMISSIONS.CALENDAR_ASSIGN, PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.USER_VIEW_TEAM, PERMISSIONS.USER_EDIT_SELF
  ],

  [ROLES.SALES_AGENT]: [
    // Personal permissions only
    PERMISSIONS.TARGET_VIEW, PERMISSIONS.TARGET_TRACK,
    PERMISSIONS.LEAD_EDIT, PERMISSIONS.LEAD_VIEW,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.ACTIVITY_CREATE, PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.ACTIVITY_EDIT,
    PERMISSIONS.ANALYTICS_PERSONAL,
    PERMISSIONS.CALENDAR_CREATE, PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.USER_EDIT_SELF
  ]
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role as Role];
    return userPermissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const canManageUsers = (): boolean => {
    return hasPermission(PERMISSIONS.USER_ASSIGN_ROLE) || hasPermission(PERMISSIONS.USER_DEACTIVATE);
  };

  const canCreateLeads = (): boolean => {
    return hasPermission(PERMISSIONS.LEAD_CREATE);
  };

  const canViewAnalytics = (): boolean => {
    return hasAnyPermission([
      PERMISSIONS.ANALYTICS_GLOBAL,
      PERMISSIONS.ANALYTICS_TEAM,
      PERMISSIONS.ANALYTICS_PERSONAL
    ]);
  };

  const canManageTargets = (): boolean => {
    return hasPermission(PERMISSIONS.TARGET_CREATE) || hasPermission(PERMISSIONS.TARGET_ASSIGN);
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    canManageUsers,
    canCreateLeads,
    canViewAnalytics,
    canManageTargets,
    isSuperAdmin: hasRole(ROLES.SUPER_ADMIN),
    isSalesManager: hasRole(ROLES.SALES_MANAGER),
    isSalesAgent: hasRole(ROLES.SALES_AGENT)
  };
}