import { describe, expect, it } from 'vitest';

import MarketingHeroTranslation from '@/contexts/MarketingHeroTranslation';
import MarketingStoryTranslation from '@/contexts/MarketingStoryTranslation';
import MarketingTranslation from '@/contexts/MarketingTranslation';
import MarketingTrustTranslation from '@/contexts/MarketingTrustTranslation';

import {
    clubIds,
    clubListKeys,
    getItem,
    heroCardLineCount,
    heroToolIds,
    heroWordCount,
    marketingItems,
    outOfScopeItems,
    quizToolIds,
    roadmapGroups,
    rolePointCount,
    roleStatus,
    roles,
    weekDayIds,
} from './marketingData';

const allKeys = (lang: 'de' | 'en'): Record<string, string> => ({
    ...MarketingTranslation[lang],
    ...MarketingStoryTranslation[lang],
    ...MarketingHeroTranslation[lang],
    ...MarketingTrustTranslation[lang],
});

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

    it.each(['de', 'en'] as const)('has every dynamic %s key the components build', (lang) => {
        const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
        const keys: string[] = [];
        for (const d of weekDayIds) keys.push(`mk.week.${d}.name`, `mk.week.${d}.short`, `mk.week.${d}.story`);
        for (const r of roles) {
            keys.push(`mk.roles.${r}.lead`, `mk.roles.${r}.not`);
            for (const n of range(rolePointCount)) keys.push(`mk.roles.${r}.p${n}`);
        }
        for (const c of clubIds) {
            keys.push(`mk.clubs.${c}.name`, `mk.clubs.${c}.scene`);
            for (const l of clubListKeys) for (const n of [1, 2, 3]) keys.push(`mk.clubs.${c}.${l}${n}`);
        }
        for (const l of clubListKeys) keys.push(`mk.clubs.list.${l}`);
        for (const id of ['rights-deny-default', 'profile-photo-minors', 'signed-links', 'sensitive-audit']) keys.push(`mk.trust.check.${id}`);
        for (const id of quizToolIds) keys.push(`mk.quiz.tool.${id}`);
        for (const n of Array.from({ length: heroWordCount }, (_, i) => i)) keys.push(`mk.hero.word.${n}`);
        for (const id of heroToolIds) keys.push(`mk.hero.obj.${id}`);
        for (const n of range(heroCardLineCount)) keys.push(`mk.hero.card.l${n}`);
        for (const g of roadmapGroups) keys.push(`mk.road.group.${g}`);
        keys.push('mk.hero.cta', 'mk.finale.cta', 'mk.finale.title.pre', 'mk.finale.title.mark', 'mk.finale.body', 'mk.finale.honest', 'mk.quiz.none');
        const missing = keys.filter((k) => !MarketingTranslation[lang][k] && !allKeys(lang)[k]);
        expect(missing).toEqual([]);
    });

    it('lists every planned group in the roadmap', () => {
        const groups = new Set(marketingItems.filter((i) => i.status === 'soon').map((i) => i.group));
        for (const g of groups) expect(roadmapGroups).toContain(g);
    });
});
