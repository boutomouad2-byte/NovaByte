#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const secret = crypto.randomBytes(48).toString('base64');
console.log('Generated JWT secret (base64):');
console.log(secret);

// Optionally write to .env if exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  if (!/JWT_SECRET=/.test(env)) {
    fs.appendFileSync(envPath, `\nJWT_SECRET=${secret}\n`);
    console.log('\nAppended JWT_SECRET to existing .env file');
  } else {
    console.log('\n.env already contains JWT_SECRET; please update it manually if desired.');
  }
} else {
  console.log('\n.no .env file detected. Create one from .env.example and set JWT_SECRET to this value.');
}
