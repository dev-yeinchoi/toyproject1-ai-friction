import { rmSync, mkdirSync } from 'node:fs';
rmSync('results/policy_raw', { recursive: true, force: true });
mkdirSync('results/policy_raw', { recursive: true });
