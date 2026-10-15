import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Same `@/*` alias as tsconfig.json so tests can import modules that use it.
export default defineConfig({
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
