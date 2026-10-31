import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `t()` only replaces `{{name}}`. A single-brace `{name}` in a translation file silently ships the raw placeholder to the
 * user, so every `*Translation.ts` file is scanned for it.
 */
describe('translation placeholders', () => {
    const dir = __dirname;
    const files = readdirSync(dir).filter((f) => /Translation\.ts$/.test(f));

    it('finds the translation files', () => {
        expect(files.length).toBeGreaterThan(5);
    });

    it.each(files)('%s has no single-brace {name} placeholders', (file) => {
        const offenders: string[] = [];
        readFileSync(join(dir, file), 'utf8')
            .split('\n')
            .forEach((line, i) => {
                // Only translation entries (`'key': 'text'`), not code.
                if (!/^\s+['"][\w.\-]+['"]:/.test(line)) return;
                if (/(?<!\{)\{\w+\}(?!\})/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
            });
        expect(offenders).toEqual([]);
    });
});
