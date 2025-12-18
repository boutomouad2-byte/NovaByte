#!/usr/bin/env node

/**
 * Setup script to help initialize the backend
 * Run with: node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('🚀 NovaByte Backend Setup\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  let envContent = '';
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  } else {
    // Create basic .env template
    envContent = `# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"

# JWT Secret (REQUIRED)
JWT_SECRET="${crypto.randomBytes(48).toString('base64url')}"

# CORS Configuration
FRONTEND_ORIGIN="http://localhost:4000"

# Rate Limiting
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info
`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file\n');
} else {
  console.log('✅ .env file already exists\n');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Dependencies installed\n');
  } catch (err) {
    console.error('❌ Failed to install dependencies:', err.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed\n');
}

// Check if Prisma client is generated
const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
if (!fs.existsSync(prismaClientPath)) {
  console.log('🔧 Generating Prisma client...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated\n');
  } catch (err) {
    console.warn('⚠️  Prisma client generation failed (this is OK if DATABASE_URL is not set yet):', err.message);
  }
} else {
  console.log('✅ Prisma client already generated\n');
}

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory\n');
}

console.log('✨ Setup complete!\n');
console.log('📋 Next steps:');
console.log('   1. Update DATABASE_URL in .env with your PostgreSQL credentials');
console.log('   2. Ensure PostgreSQL is running');
console.log('   3. Run: npm run dev');
console.log('\n');

