// Palette registry (ADR-008): a palette is a registry entry here, applied at
// runtime by writing its tokens as inline CSS custom properties on
// <html> (see PaletteProvider.tsx) -- globals.css's `:root`/`.dark` blocks
// stay as the "ink-navy" palette's values (and the pre-hydration default for
// every visitor, so a first paint never needs JS to look correct).
export interface TokenSet {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
}

export interface Palette {
    label: string;
    light: TokenSet;
    dark: TokenSet;
}

// Maps each TokenSet key to the CSS custom property it drives -- see
// globals.css's `:root`/`.dark` blocks for the property list this mirrors.
export const TOKEN_CSS_VARS: Record<keyof TokenSet, string> = {
    background: '--background',
    foreground: '--foreground',
    card: '--card',
    cardForeground: '--card-foreground',
    muted: '--muted',
    mutedForeground: '--muted-foreground',
    border: '--border',
    primary: '--primary',
    primaryForeground: '--primary-foreground',
    accent: '--accent',
    accentForeground: '--accent-foreground',
};

export const palettes = {
    // MyVerein's own brand palette (see the company vault's
    // "Product Color - MyVerein" doc) -- the first entry in this registry
    // where `primary` and `accent` are deliberately different colors
    // (Vereinsblau for chrome/navigation, Pokal-Gold as a warm counterweight
    // for CTAs/highlights) rather than the same hex repeated, since every
    // other predefined palette here happens to use one hue for both.
    vereinsblau: {
        label: 'Vereinsblau',
        light: {
            background: '#fafaf7', foreground: '#22252b',
            card: '#ffffff', cardForeground: '#22252b',
            muted: '#eef0f2', mutedForeground: '#6b7280',
            border: '#e2e4e8',
            primary: '#2c4870', primaryForeground: '#ffffff',
            accent: '#b8860b', accentForeground: '#ffffff',
        },
        dark: {
            background: '#16181d', foreground: '#e8e9ec',
            card: '#1e2127', cardForeground: '#e8e9ec',
            muted: '#282b32', mutedForeground: '#b4b8c0',
            border: '#343841',
            primary: '#7a9bc7', primaryForeground: '#16181d',
            accent: '#e0b84d', accentForeground: '#16181d',
        },
    },
    'ink-navy': {
        label: 'Ink Navy',
        light: {
            background: '#ffffff', foreground: '#2e3338',
            card: '#ffffff', cardForeground: '#2e3338',
            muted: '#f1f2f4', mutedForeground: '#6b7280',
            border: '#e3e4e6',
            primary: '#1e293b', primaryForeground: '#ffffff',
            accent: '#1e293b', accentForeground: '#ffffff',
        },
        dark: {
            background: '#1e1e1e', foreground: '#dcddde',
            card: '#2a2a2b', cardForeground: '#dcddde',
            muted: '#2a2a2b', mutedForeground: '#9a9a9d',
            border: '#3a3a3c',
            primary: '#64748b', primaryForeground: '#ffffff',
            accent: '#64748b', accentForeground: '#ffffff',
        },
    },
    ocean: {
        label: 'Ocean',
        light: {
            background: '#ffffff', foreground: '#1b2733',
            card: '#ffffff', cardForeground: '#1b2733',
            muted: '#eef4f7', mutedForeground: '#5b7285',
            border: '#dde7ec',
            primary: '#0e7490', primaryForeground: '#ffffff',
            accent: '#0e7490', accentForeground: '#ffffff',
        },
        dark: {
            background: '#0f1b22', foreground: '#dbe7ec',
            card: '#16262e', cardForeground: '#dbe7ec',
            muted: '#16262e', mutedForeground: '#8fa5b0',
            border: '#23343c',
            primary: '#22b8cf', primaryForeground: '#06222a',
            accent: '#22b8cf', accentForeground: '#06222a',
        },
    },
    forest: {
        label: 'Forest',
        light: {
            background: '#ffffff', foreground: '#232b24',
            card: '#ffffff', cardForeground: '#232b24',
            muted: '#f0f4ef', mutedForeground: '#667368',
            border: '#dfe6dd',
            primary: '#2f6f4e', primaryForeground: '#ffffff',
            accent: '#2f6f4e', accentForeground: '#ffffff',
        },
        dark: {
            background: '#16201a', foreground: '#dde6da',
            card: '#1f2b23', cardForeground: '#dde6da',
            muted: '#1f2b23', mutedForeground: '#90a08f',
            border: '#2c3a30',
            primary: '#5fae7f', primaryForeground: '#0d1a12',
            accent: '#5fae7f', accentForeground: '#0d1a12',
        },
    },
    sunset: {
        label: 'Sunset',
        light: {
            background: '#fffefb', foreground: '#322620',
            card: '#ffffff', cardForeground: '#322620',
            muted: '#f6efe7', mutedForeground: '#8a7360',
            border: '#ece0d3',
            primary: '#c2542a', primaryForeground: '#ffffff',
            accent: '#c2542a', accentForeground: '#ffffff',
        },
        dark: {
            background: '#241813', foreground: '#ecdfd4',
            card: '#2e211a', cardForeground: '#ecdfd4',
            muted: '#2e211a', mutedForeground: '#b39d8b',
            border: '#3d2c22',
            primary: '#e2793f', primaryForeground: '#241209',
            accent: '#e2793f', accentForeground: '#241209',
        },
    },
} satisfies Record<string, Palette>;

export type PaletteId = keyof typeof palettes | 'custom';
export const predefinedPaletteIds = Object.keys(palettes) as (keyof typeof palettes)[];
export const DEFAULT_PALETTE_ID: PaletteId = 'vereinsblau';

export function isPredefinedPaletteId(value: string): value is keyof typeof palettes {
    return Object.prototype.hasOwnProperty.call(palettes, value);
}
