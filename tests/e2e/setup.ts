import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.e2e
const envPath = resolve(process.cwd(), '.env.e2e');
if (!existsSync(envPath)) {
  throw new Error(
    'Missing .env.e2e file. Copy .env.e2e.example to .env.e2e and fill in values.'
  );
}

const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

// Validate required env vars
const required = ['E2E_PRIVATE_KEY', 'E2E_API_BASE_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}. Check your .env.e2e file.`);
  }
}
