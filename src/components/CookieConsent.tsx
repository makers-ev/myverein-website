'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { GoogleAnalytics } from '@next/third-parties/google';

import { useLanguage } from '@/contexts/LanguageContext';

interface CookieCategory {
    id: string;
    required: boolean;
    enabled: boolean;
}

// Wir reduzieren das Default-Array auf die Logik (IDs und defaults)
// Die Texte kommen jetzt live aus der Translation
const DEFAULT_CATEGORIES = [
    {
        id: 'technical',
        required: true,
        enabled: true,
    },
    {
        id: 'analytics',
        required: false,
        enabled: false,
    },
];

const CookieConsent = ({ gaId }: { gaId?: string }) => {
    // 2. Hook initialisieren
    const { t } = useLanguage();

    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [preferences, setPreferences] = useState<CookieCategory[]>(
        DEFAULT_CATEGORIES
    );

    const isAnalyticsEnabled = preferences.find(
        (c) => c.id === 'analytics'
    )?.enabled;

    useEffect(() => {
        const savedConsent = localStorage.getItem('cookie-consent');
        if (!savedConsent) {
            // localStorage is a browser-only API, unavailable during SSR --
            // this can only run after mount, which is what useEffect is for.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsVisible(true);
        } else {
            try {
                const parsed: CookieCategory[] = JSON.parse(savedConsent);
                const merged = DEFAULT_CATEGORIES.map((cat) => {
                    const savedCat = parsed.find((p) => p.id === cat.id);
                    return savedCat
                        ? { ...cat, enabled: savedCat.enabled }
                        : cat;
                });
                setPreferences(merged);
            } catch (error) {
                console.error(
                    'Error parsing cookie consent from localStorage:',
                    error
                );
                setIsVisible(true);
                return;
            }
        }

        const handleOpenSettings = () => {
            setIsVisible(true);
            setIsExpanded(true);
        };

        window.addEventListener('open-cookie-settings', handleOpenSettings);

        return () => {
            window.removeEventListener(
                'open-cookie-settings',
                handleOpenSettings
            );
        };
    }, []);

    const handleToggle = (id: string) => {
        setPreferences((prev) =>
            prev.map((cat) => {
                if (cat.id === id && !cat.required) {
                    return { ...cat, enabled: !cat.enabled };
                }
                return cat;
            })
        );
    };

    const savePreferences = (newPreferences: CookieCategory[]) => {
        // Hier speichern wir die Preferences
        // (Texte speichern wir NICHT im LocalStorage, nur IDs und Status, das spart Platz und vermeidet Sprach-Mix)
        localStorage.setItem('cookie-consent', JSON.stringify(newPreferences));
        setPreferences(newPreferences);
        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        const allEnabled = preferences.map((cat) => ({
            ...cat,
            enabled: true,
        }));
        setPreferences(allEnabled);
        savePreferences(allEnabled);
    };

    const handleSaveSelection = () => {
        savePreferences(preferences);
    };

    return (
        <>
            {isAnalyticsEnabled && gaId && (
                <GoogleAnalytics gaId={gaId} />
            )}

            {/* Wenn nicht sichtbar, rendern wir nichts (oder den Re-Open Button) */}
            {!isVisible ? null : (
                <div className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md">
                    <div>
                        {/* Header Section */}
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={24} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                                <div>
                                    {/* 3. Texte durch t() ersetzen */}
                                    <h2 className="text-base font-semibold">
                                        {t('cookie.title')}
                                    </h2>
                                    <p className="text-sm mt-1 text-muted-foreground">
                                        {t('cookie.description')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() =>
                                        setIsExpanded(!isExpanded)
                                    }
                                    className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted sm:hidden"
                                >
                                    {isExpanded ? (
                                        <ChevronDown />
                                    ) : (
                                        <ChevronUp />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Switches Section */}
                        <div
                            className={`mb-5 space-y-2 ${
                                isExpanded ? 'block' : 'hidden sm:block'
                            }`}
                        >
                            {preferences.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3"
                                >
                                    <div className="pr-4">
                                        {/* 4. Hier ist der Trick: Wir bauen den Key dynamisch aus der ID */}
                                        {/* Z.B. cookie.technical.label */}
                                        <span className="block text-sm font-medium">
                                            {t(
                                                `cookie.${category.id}.label`
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {t(
                                                `cookie.${category.id}.description`
                                            )}
                                        </span>
                                    </div>

                                    {/* Custom Toggle Switch */}
                                    <button
                                        onClick={() =>
                                            handleToggle(category.id)
                                        }
                                        disabled={category.required}
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                            category.required
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                        } ${category.enabled ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                                    >
                                        <span
                                            className={`${
                                                category.enabled
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                            <button
                                onClick={handleSaveSelection}
                                className="min-h-11 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
                            >
                                {t('cookie.save')}
                            </button>

                            <button
                                onClick={handleAcceptAll}
                                className="min-h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
                            >
                                {t('cookie.acceptAll')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CookieConsent;
