// Define all permissions as const assertions for perfect TypeScript intellisense
export const PERMISSIONS = {
  // User Management
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read', 
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE: 'users.manage', // All user operations

  // Property Management  
  PROPERTIES_CREATE: 'properties.create',
  PROPERTIES_READ: 'properties.read',
  PROPERTIES_UPDATE: 'properties.update', 
  PROPERTIES_DELETE: 'properties.delete',
  PROPERTIES_MANAGE: 'properties.manage',

  // Booking Management
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_READ: 'bookings.read',
  BOOKINGS_UPDATE: 'bookings.update',
  BOOKINGS_DELETE: 'bookings.delete', 
  BOOKINGS_MANAGE: 'bookings.manage',

  // System & Reports
  REPORTS_VIEW: 'reports.view',
  SYSTEM_MANAGE: 'system.manage',
  ADMIN_PANEL: 'admin.panel',
} as const;

// Extract permission values as union type
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role definitions with their permissions
export const ROLE_PERMISSIONS = {
  super_admin: [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PROPERTIES_MANAGE, 
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