#!/usr/bin/env node

/**
 * Test runner script for RideReels platform
 * Usage: node run-tests.js [--health|--core|--e2e|--api]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testRunner = join(__dirname, 'test', 'run-all-tests.js');
const args = process.argv.slice(2);

// Set test environment
process.env.NODE_ENV = 'test';

console.log('🧪 Starting RideReels Test Suite...\n');

const child = spawn('node', [testRunner, ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});

child.on('exit', (code) => {
  console.log(`\n✅ Test suite completed with exit code: ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error(`❌ Test runner error: ${error.message}`);
  process.exit(1);
});