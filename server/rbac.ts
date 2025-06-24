import { User } from "@shared/schema";

// Role definitions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager', 
  SALES_AGENT: 'sales_agent'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Permission categories
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

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: [
    // Target Management - Full permissions
    PERMISSIONS.TARGET_CREATE,
    PERMISSIONS.TARGET_ASSIGN,
    PERMISSIONS.TARGET_EDIT,
    PERMISSIONS.TARGET_VIEW,
    PERMISSIONS.TARGET_TRACK,
    PERMISSIONS.TARGET_DELETE,

    // Lead Management - Full permissions
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_VIEW,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_IMPORT,
    PERMISSIONS.LEAD_EXPORT,

    // Pipeline and Activity - Full permissions
    PERMISSIONS.PIPELINE_CONFIG,
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_EDIT,
    PERMISSIONS.ACTIVITY_CREATE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.ACTIVITY_EDIT,

    // Analytics - Full access
    PERMISSIONS.ANALYTICS_GLOBAL,
    PERMISSIONS.ANALYTICS_TEAM,
    PERMISSIONS.ANALYTICS_PERSONAL,

    // Calendar - Full permissions
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_ASSIGN,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.CALENDAR_SYNC,

    // User Management - Full permissions
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_ASSIGN_ROLE,
    PERMISSIONS.USER_DEACTIVATE,
    PERMISSIONS.USER_VIEW_TEAM,
    PERMISSIONS.USER_EDIT_SELF
  ],

  [ROLES.SALES_MANAGER]: [
    // Target Management - Team only
    PERMISSIONS.TARGET_CREATE,
    PERMISSIONS.TARGET_ASSIGN,
    PERMISSIONS.TARGET_EDIT,
    PERMISSIONS.TARGET_VIEW,
    PERMISSIONS.TARGET_TRACK,

    // Lead Management - Team only
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_VIEW,
    PERMISSIONS.LEAD_DELETE,

    // Pipeline and Activity - Team level
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.PIPELINE_EDIT,
    PERMISSIONS.ACTIVITY_CREATE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.ACTIVITY_EDIT,

    // Analytics - Team specific
    PERMISSIONS.ANALYTICS_TEAM,
    PERMISSIONS.ANALYTICS_PERSONAL,

    // Calendar - Team tasks
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_ASSIGN,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,

    // User Management - View team only
    PERMISSIONS.USER_VIEW_TEAM,
    PERMISSIONS.USER_EDIT_SELF
  ],

  [ROLES.SALES_AGENT]: [
    // Target Management - View assigned only
    PERMISSIONS.TARGET_VIEW,
    PERMISSIONS.TARGET_TRACK,

    // Lead Management - Assigned leads only
    PERMISSIONS.LEAD_EDIT,
    PERMISSIONS.LEAD_VIEW,

    // Pipeline and Activity - Own deals only
    PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.ACTIVITY_CREATE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.ACTIVITY_EDIT,

    // Analytics - Personal only
    PERMISSIONS.ANALYTICS_PERSONAL,

    // Calendar - Personal tasks
    PERMISSIONS.CALENDAR_CREATE,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,

    // User Management - Self only
    PERMISSIONS.USER_EDIT_SELF
  ]
};

// Permission checking functions
export function hasPermission(user: User, permission: Permission): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role as Role];
  return userPermissions?.includes(permission) || false;
}

export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

// Resource ownership checks
export function canAccessResource(user: User, resourceOwnerId: string, permission: Permission): boolean {
  // Super Admin can access everything
  if (user.role === ROLES.SUPER_ADMIN) {
    return hasPermission(user, permission);
  }

  // Sales Manager can access team resources
  if (user.role === ROLES.SALES_MANAGER) {
    return hasPermission(user, permission) && (
      resourceOwnerId === user.id || // Own resources
      isTeamMember(user.id, resourceOwnerId) // Team member resources
    );
  }

  // Sales Agent can only access own resources
  if (user.role === ROLES.SALES_AGENT) {
    return hasPermission(user, permission) && resourceOwnerId === user.id;
  }

  return false;
}

export function canAccessUser(currentUser: User, targetUserId: string): boolean {
  // Super Admin can access all users
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  // Sales Manager can access team members
  if (currentUser.role === ROLES.SALES_MANAGER) {
    return targetUserId === currentUser.id || isTeamMember(currentUser.id, targetUserId);
  }

  // Sales Agent can only access themselves
  return targetUserId === currentUser.id;
}

// Helper function to check if a user is a team member (will be implemented with storage)
function isTeamMember(managerId: string, userId: string): boolean {
  // This will be implemented with actual database lookup
  // For now, return false - will be properly implemented in storage layer
  return false;
}

// Middleware for permission checking
export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasPermission(user, permission)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
}

export function requireAnyPermission(permissions: Permission[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAnyPermission(user, permissions)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
}

export function requireRole(role: Role) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
}