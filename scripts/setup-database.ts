/**
 * Database Setup Script
 * 
 * Initializes the database schema for theme preferences
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupDatabase() {
  console.log('🗄️  Setting up database...\n');

  try {
    // Generate Prisma Client
    console.log('📦 Generating Prisma Client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma Client generated\n');

    // Push schema to database
    console.log('🚀 Pushing schema to database...');
    await execAsync('npx prisma db push');
    console.log('✅ Schema pushed to database\n');

    console.log('🎉 Database setup complete!\n');
    console.log('You can now use theme preferences with database persistence.');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
