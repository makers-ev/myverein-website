'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';

import { palettes, TOKEN_CSS_VARS, DEFAULT_PALETTE_ID, isPredefinedPaletteId, type PaletteId } from '@/theme/palettes';
import { deriveTokens, type PaletteAnchors } from '@/theme/deriveTokens';

const PALETTE_ID_KEY = 'color-palette-id';
const CUSTOM_ANCHORS_KEY = 'color-palette-custom';

const DEFAULT_CUSTOM: { light: PaletteAnchors; dark: PaletteAnchors } = {
    light: { background: '#ffffff', foreground: '#2e3338', primary: '#1e293b' },
    dark: { background: '#1e1e1e', foreground: '#dcddde', primary: '#64748b' },
};

interface PaletteContextValue {
    paletteId: PaletteId;
    setPaletteId: (id: PaletteId) => void;
    customAnchors: { light: PaletteAnchors; dark: PaletteAnchors };
    setCustomAnchors: (anchors: { light: PaletteAnchors; dark: PaletteAnchors }) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette(): PaletteContextValue {
    const ctx = useContext(PaletteContext);
    if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
    return ctx;
}

/**
 * Applies the selected palette's tokens as inline CSS custom properties on
 * <html>, overriding globals.css's `:root`/`.dark` defaults (which stay the
 * "ink-navy" palette, so a first paint before this effect runs is always
 * correct for the default palette).
 *
 * ponytail: no pre-hydration script here (unlike next-themes' own FOUC
 * script), so switching to a *non-default* palette flashes ink-navy for one
 * frame on reload. Fixing that needs a nonce'd blocking script mirroring
 * next-themes' approach -- add if this flash is reported as an actual
 * annoyance, not preemptively.
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [paletteId, setPaletteIdState] = useState<PaletteId>(DEFAULT_PALETTE_ID);
    const [customAnchors, setCustomAnchorsState] = useState(DEFAULT_CUSTOM);

    useEffect(() => {
        // Reads localStorage (an external source, unavailable during SSR) once
        // on mount -- the same documented "sync from external source" exception
        // ThemeToggle.tsx's own mount guard relies on.
        try {
            const storedId = localStorage.getItem(PALETTE_ID_KEY);
            if (storedId && (storedId === 'custom' || isPredefinedPaletteId(storedId))) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPaletteIdState(storedId as PaletteId);
            }
            const storedCustom = localStorage.getItem(CUSTOM_ANCHORS_KEY);
            if (storedCustom) setCustomAnchorsState(JSON.parse(storedCustom));
        } catch {
            // localStorage unavailable (private mode, SSR-adjacent edge cases) -- defaults stand.
        }
    }, []);

    const setPaletteId = (id: PaletteId) => {
        setPaletteIdState(id);
        try {
            localStorage.setItem(PALETTE_ID_KEY, id);
        } catch {
            // best-effort persistence only
        }
    };

    const setCustomAnchors = (anchors: { light: PaletteAnchors; dark: PaletteAnchors }) => {
        setCustomAnchorsState(anchors);
        try {
            localStorage.setItem(CUSTOM_ANCHORS_KEY, JSON.stringify(anchors));
        } catch {
            // best-effort persistence only
        }
    };

    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        const tokens = paletteId === 'custom'
            ? deriveTokens(isDark ? customAnchors.dark : customAnchors.light)
            : (isDark ? palettes[paletteId].dark : palettes[paletteId].light);

        const root = document.documentElement;
        for (const [key, cssVar] of Object.entries(TOKEN_CSS_VARS)) {
            root.style.setProperty(cssVar, tokens[key as keyof typeof tokens]);
        }
    }, [paletteId, customAnchors, isDark]);

    const value = useMemo(
        () => ({ paletteId, setPaletteId, customAnchors, setCustomAnchors }),
        [paletteId, customAnchors],
    );

    return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}
