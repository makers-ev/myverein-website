#!/usr/bin/env node
// DS3: DE/EN key and placeholder parity. Runs the vitest suite that reads the real merged translation tables, so it can never
// drift from what t() serves. Other languages fall back to English per key by design (README "Internationalisation").
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'src/contexts/i18nParity.test.ts', 'src/contexts/LanguageContext.test.ts'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
