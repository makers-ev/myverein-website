import { describe, expect, it } from 'vitest';

import { resolveAcceptLanguage } from './acceptLanguage';
import { supportedLanguageIds } from './supportedLanguages';

describe('resolveAcceptLanguage', () => {
    it('picks the first supported tag, respecting header order', () => {
        expect(resolveAcceptLanguage('fr-CA,fr;q=0.9,de;q=0.8', supportedLanguageIds)).toBe('fr');
    });

    it('falls back from region-qualified to base language', () => {
        expect(resolveAcceptLanguage('en-US,en;q=0.9', supportedLanguageIds)).toBe('en');
    });

    it('maps common Chinese region variants onto zh-Hans', () => {
        expect(resolveAcceptLanguage('zh-CN,zh;q=0.9', supportedLanguageIds)).toBe('zh-Hans');
    });

    it('returns null when nothing matches', () => {
        expect(resolveAcceptLanguage('ko-KR,ko;q=0.9', supportedLanguageIds)).toBeNull();
    });

    it('returns null for an empty or missing header', () => {
        expect(resolveAcceptLanguage(null, supportedLanguageIds)).toBeNull();
        expect(resolveAcceptLanguage('', supportedLanguageIds)).toBeNull();
    });
});
