import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Modals are rendered inside forms (e.g. photo dialog in a location form): an untyped <button> would submit that form.
describe('modal buttons', () => {
    for (const file of ['Modal.tsx', 'verein/MemberPhotoDialog.tsx']) {
        it(`${file}: every <button> has an explicit type`, () => {
            const src = readFileSync(join(__dirname, file), 'utf8');
            const tags = src.match(/<button\b[^>]*>/g) ?? [];
            expect(tags.length).toBeGreaterThan(0);
            for (const tag of tags) expect(tag).toMatch(/type="button"|type=\{/);
        });
    }
});
