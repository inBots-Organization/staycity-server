#!/usr/bin/env bun

import { UserService } from '../src/services/userService';

async function seedUser() {
  try {
    console.log('🔗 Connecting to database...');

    // Check if user already exists
    const existingUser = await UserService.findByEmail('info@macsoft.ai');
    if (existingUser) {
      console.log('👤 User already exists with email: info@macsoft.ai');
      process.exit(0);
    }

    // Create seed user
    const seedUser = await UserService.createUser({
      name: 'Macsoft Admin',
      email: 'info@macsoft.ai',
      password: 'wessal@2025',
      role: 'super_admin'
    });

    console.log('✅ Seed user created successfully!');
    console.log('📧 Email: info@macsoft.ai');
    console.log('🔑 Password: wessal@2025');

  } catch (error) {
    console.error('❌ Error seeding user:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  seedUser();
}

export { seedUser };