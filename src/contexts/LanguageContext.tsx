'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

import { appName, defaultLanguage } from '../../project.config.json';
import { COOKIE_NAME } from './languageCookie';
import { type Language, supportedLanguageIds, isSupportedLanguage } from './supportedLanguages';
import PageLayoutTranslation from './PageLayoutTranslation';
import ComponentTranslation from './ComponentTranslation';
import HomeTranslation from './HomeTranslation';
import AuthTranslation from './AuthTranslation';
import LegalTranslation from './LegalTranslation';
import NotificationTranslation from './NotificationTranslation';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

// LegalTranslation stays DE/EN-only by design (ADR-009) -- it's spread only
// for those two languages, every other language's legal.* keys resolve via
// t()'s English fallback below, and LegalDocument.tsx layers a visible
// "shown in English" banner on top of that silent fallback.
// Exported for LanguageContext.test.ts -- the real merged data t() reads
// from, not a copy re-implemented in the test.
export const translations: Record<Language, Record<string, string>> = supportedLanguageIds.reduce(
    (acc, id) => {
        acc[id] = {
            ...PageLayoutTranslation[id],
            ...ComponentTranslation[id],
            ...HomeTranslation[id],
            ...AuthTranslation[id],
            ...NotificationTranslation[id],
            ...(id === 'de' || id === 'en' ? LegalTranslation[id] : {}),
        };
        return acc;
    },
    {} as Record<Language, Record<string, string>>,
);

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
    children,
    initialLanguage,
}: {
    children: ReactNode;
    initialLanguage?: Language;
}) {
    const [language, setLanguageState] = useState<Language>(initialLanguage ?? (defaultLanguage as Language));

    // Check Cookie on Mount — state updates after mount to avoid a blank-page flash.
    // The initial render uses project.config.json's defaultLanguage; if the
    // cookie says otherwise a single re-render happens to switch language
    // without blanking the page.
    useEffect(() => {
        const savedLanguage = Cookies.get(COOKIE_NAME);
        if (isSupportedLanguage(savedLanguage)) {
            // Reading a cookie is a browser-only operation, unavailable during
            // SSR -- this can only run after mount.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLanguageState(savedLanguage);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        Cookies.set(COOKIE_NAME, lang, { expires: 365 });
    };

    // `{{paramName}}` interpolation for content that carries dynamic values
    // as data instead of a fixed string. `appName` from project.config.json
    // is always available this way (e.g. LegalTranslation.ts's `{{appName}}`
    // occurrences) -- an explicit `params.appName` (the backend's welcome
    // notification passes its own via `paramsJson`, see
    // NotificationTranslation.ts) overrides it per call.
    const t = (key: string, params?: Record<string, string | number>): string => {
        const currentLang = translations[language] ? language : 'en';
        // Per-key fallback to English (ADR-009): a rolling translation rollout
        // means a key can exist in English before it's been added to every
        // other language -- showing the English text beats a raw key.
        const template = translations[currentLang][key] ?? translations.en[key] ?? key;
        const allParams = { appName, ...params };
        return Object.entries(allParams).reduce(
            (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
            template,
        );
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
