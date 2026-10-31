import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// An `sr-only` element is absolutely positioned. Without a positioned ancestor it is placed relative to the page, and inside a
// horizontally scrolling table wrapper its static position lies far right: the document gets a horizontal scrollbar (the
// /verein "Mitglieder" tab measured scrollWidth 842 at 375px). Every wrapper of a table that contains an sr-only element
// must therefore be `relative` as well as `overflow-x-auto`.
function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sources(path);
        return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
}

describe('table wrappers', () => {
    for (const file of sources(join(__dirname, '..')).filter((f) => /<table\b/.test(readFileSync(f, 'utf8')))) {
        it(`${file.split('/src/')[1]}: tables are wrapped in relative overflow-x-auto`, () => {
            const src = readFileSync(file, 'utf8');
            const tables = src.match(/<table\b/g)?.length ?? 0;
            const wrappers = src.match(/relative overflow-x-auto/g)?.length ?? 0;
            if (/sr-only/.test(src)) expect(wrappers).toBeGreaterThanOrEqual(tables);
            expect(src.match(/overflow-x-auto/g)?.length ?? 0).toBeGreaterThanOrEqual(tables);
        });
    }
});
