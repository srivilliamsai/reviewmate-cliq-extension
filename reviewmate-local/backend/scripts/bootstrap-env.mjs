#!/usr/bin/env node
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';

const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  console.log('.env already exists. Skipping creation.');
  process.exit(0);
}

const randomHex = () => crypto.randomBytes(32).toString('hex');

const content = `PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/reviewmate
JWT_SECRET=${randomHex()}
GITHUB_TOKEN_SECRET=${randomHex()}
CLIENT_ORIGIN=http://localhost:5173
`;

writeFileSync(envPath, content, { encoding: 'utf8', flag: 'wx' });
console.log(`Created ${envPath}`);
