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
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card text-card-foreground p-4 shadow-2xl md:p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={32} className="text-accent" />
                                <div>
                                    {/* 3. Texte durch t() ersetzen */}
                                    <h2 className="text-lg font-bold">
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
                                    className="md:hidden p-2 rounded hover:bg-muted transition-colors ml-auto"
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
                            className={`space-y-3 mb-6 ${
                                isExpanded ? 'block' : 'hidden md:block'
                            }`}
                        >
                            {preferences.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted"
                                >
                                    <div className="pr-4">
                                        {/* 4. Hier ist der Trick: Wir bauen den Key dynamisch aus der ID */}
                                        {/* Z.B. cookie.technical.label */}
                                        <span className="font-semibold block">
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
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card ${
                                            category.required
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                        } ${category.enabled ? 'bg-accent' : 'bg-muted-foreground/30'}`}
                                    >
                                        <span
                                            className={`${
                                                category.enabled
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col md:flex-row gap-3 justify-end pt-2 border-t border-border">
                            <button
                                onClick={handleSaveSelection}
                                className="px-6 py-2 rounded-md font-medium text-sm transition-all border border-accent text-accent hover:bg-accent/10"
                            >
                                {t('cookie.save')}
                            </button>

                            <button
                                onClick={handleAcceptAll}
                                className="px-6 py-2 rounded-md font-medium text-sm bg-accent text-accent-foreground transition-all hover:brightness-110"
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
