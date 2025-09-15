// Define all permissions as const assertions for perfect TypeScript intellisense
export const PERMISSIONS = {
  // User Management
  USERS_CREATE: 'users_create',
  USERS_READ: 'users_read', 
  USERS_UPDATE: 'users_update',
  USERS_DELETE: 'users_delete',
  USERS_MANAGE: 'users_manage', // All user operations

  // Property Management  
  PROPERTIES_CREATE: 'properties_create',
  PROPERTIES_READ: 'properties_read',
  PROPERTIES_UPDATE: 'properties_update', 
  PROPERTIES_DELETE: 'properties_delete',
  PROPERTIES_MANAGE: 'properties_manage',

  // Booking Management
  BOOKINGS_CREATE: 'bookings_create',
  BOOKINGS_READ: 'bookings_read',
  BOOKINGS_UPDATE: 'bookings_update',
  BOOKINGS_DELETE: 'bookings_delete', 
  BOOKINGS_MANAGE: 'bookings_manage',

  // System & Reports
  REPORTS_VIEW: 'reports_view',
  SYSTEM_MANAGE: 'system_manage',
  ADMIN_PANEL: 'admin_panel',
} as const;

// Extract permission values as union type
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role definitions with their permissions
export const ROLE_PERMISSIONS = {
  super_admin: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PROPERTIES_CREATE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_UPDATE,
    PERMISSIONS.PROPERTIES_DELETE,
    PERMISSIONS.PROPERTIES_MANAGE,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.BOOKINGS_DELETE,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SYSTEM_MANAGE,
    PERMISSIONS.ADMIN_PANEL,
  ],
  admin: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.PROPERTIES_MANAGE,
    PERMISSIONS.BOOKINGS_MANAGE, 
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ADMIN_PANEL,
  ],
  manager: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.PROPERTIES_MANAGE,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  user: [
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_READ,
  ],
} as const;

// Extract role names as union type
export type RoleName = keyof typeof ROLE_PERMISSIONS;

// Helper function to get permissions for a role
export function getRolePermissions(role: RoleName): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

// Helper function to check if role has permission
export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}