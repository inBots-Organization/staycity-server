#!/usr/bin/env bun

import mongoose from 'mongoose';
import { User } from '../src/models/User';

async function seedUser() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔗 Connecting to cloud MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('🔌 Connected to MongoDB successfully');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'info@macsoft.ai' });
    if (existingUser) {
      console.log('👤 User already exists with email: info@macsoft.ai');
      process.exit(0);
    }

    // Create seed user
    const seedUser = new User({
      name: 'Macsoft Admin',
      email: 'info@macsoft.ai',
      password: 'wessal@2025',
      role: 'super_admin'
    });

    await seedUser.save();
    console.log('✅ Seed user created successfully!');
    console.log('📧 Email: info@macsoft.ai');
    console.log('🔑 Password: wessal@2025');

  } catch (error) {
    console.error('❌ Error seeding user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.main) {
  seedUser();
}

export { seedUser };