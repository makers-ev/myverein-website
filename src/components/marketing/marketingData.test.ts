import { describe, expect, it } from 'vitest';

import MarketingTranslation from '@/contexts/MarketingTranslation';

import { getItem, marketingItems, outOfScopeItems, roleStatus, roles } from './marketingData';

describe('marketingData', () => {
    it('has unique ids', () => {
        const ids = [...marketingItems.map((i) => i.id), ...outOfScopeItems.map((i) => i.id)];
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives every planned item a wave', () => {
        const missing = marketingItems.filter((i) => i.status === 'soon' && !i.wave).map((i) => i.id);
        expect(missing).toEqual([]);
    });

    it('gives every live item a feature reference', () => {
        const missing = marketingItems.filter((i) => i.status === 'live' && !i.featureRef?.length).map((i) => i.id);
        expect(missing).toEqual([]);
    });

    it('follows the i18n key schema', () => {
        for (const item of marketingItems) expect(item.i18nKey).toBe(`mk.item.${item.id}`);
    });

    it.each(['de', 'en'] as const)('has %s title and body for every item', (lang) => {
        const missing: string[] = [];
        for (const { i18nKey } of [...marketingItems, ...outOfScopeItems]) {
            for (const part of ['title', 'body']) {
                if (!MarketingTranslation[lang][`${i18nKey}.${part}`]) missing.push(`${i18nKey}.${part}`);
            }
        }
        expect(missing).toEqual([]);
    });

    it.each(['de', 'en'] as const)('has a %s name for every role', (lang) => {
        const missing = roles.filter((r) => !MarketingTranslation[lang][`mk.role.${r}.name`]);
        expect(missing).toEqual([]);
    });

    it('keeps the parent role planned until parent access ships', () => {
        expect(roleStatus('eltern')).toBe(getItem('parent-access').status);
        expect(roleStatus('mitglied')).toBe('live');
    });
});
