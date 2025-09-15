#!/usr/bin/env bun

import { UserService } from '../src/services/userService';
import { prisma } from '../src/config/prisma';
import { Permission, RoleName } from '../src/generated/prisma';

async function seedUser() {
  // Collect all enum values from Prisma
  const ALL_PERMISSIONS = Object.values(Permission) as Permission[];

  try {
    console.log('🔗 Connecting to database...');

    // Ensure the super_admin role exists with ALL permissions
    await prisma.role.upsert({
      where: { name: 'super_admin' as RoleName },
      update: { permissions: ALL_PERMISSIONS },
      create: { name: 'super_admin' as RoleName, permissions: ALL_PERMISSIONS },
    });
    console.log(
      `🛡️  Role 'super_admin' is upserted with ${ALL_PERMISSIONS.length} permissions.`
    );

    // Check if the user already exists
    const email = 'info@macsoft.ai';
    const existingUser = await UserService.findByEmail(email);

    if (existingUser) {
      // Make sure the existing user is super_admin
      if (existingUser.role !== 'super_admin') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'super_admin' },
        });
        console.log(`👤 Existing user updated to role: super_admin`);
      } else {
        console.log('👤 User already exists and is super_admin.');
      }
      console.log(`📧 Email: ${email}`);
      return;
    }

    // Create seed user as super_admin
    const seedUser = await UserService.createUser({
      name: 'Macsoft Admin',
      email,
      password: 'wessal@2025',
      role: 'super_admin',
    });

    console.log('✅ Seed user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log('🔑 Password: wessal@2025');
    console.log('🛡️  Role: super_admin (all permissions)');
  } catch (error) {
    console.error('❌ Error seeding user:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.main) {
  seedUser();
}

export { seedUser };
