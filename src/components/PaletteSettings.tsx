'use client';

import { usePalette } from '@/components/PaletteProvider';
import { palettes, predefinedPaletteIds } from '@/theme/palettes';
import type { PaletteAnchors } from '@/theme/deriveTokens';
import { useLanguage } from '@/contexts/LanguageContext';

function Swatch({ color }: { color: string }) {
    return <span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: color }} />;
}

/** 6 native color inputs (light/dark x background/foreground/primary) -- ladder: `<input type="color">` is a native picker, no library needed for a template. */
function CustomEditor() {
    const { customAnchors, setCustomAnchors } = usePalette();

    const updateAnchor = (mode: 'light' | 'dark', key: keyof PaletteAnchors, value: string) => {
        setCustomAnchors({ ...customAnchors, [mode]: { ...customAnchors[mode], [key]: value } });
    };

    return (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
            {(['light', 'dark'] as const).map((mode) => (
                <div key={mode} className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{mode}</span>
                    {(['background', 'foreground', 'primary'] as const).map((key) => (
                        <label key={key} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{key}</span>
                            <input
                                type="color"
                                value={customAnchors[mode][key]}
                                onChange={(e) => updateAnchor(mode, key, e.target.value)}
                                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                            />
                        </label>
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Inline "Appearance" card for the Settings page -- same predefined-palette
 * swatches + custom editor as PaletteMenu.tsx's Navbar dropdown, just laid
 * out flat instead of inside a popover (Settings already has the room). */
export function PaletteSettings() {
    const { t } = useLanguage();
    const { paletteId, setPaletteId } = usePalette();

    return (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{t('settings.section-appearance')}</h2>
            <p className="text-sm text-muted-foreground">{t('settings.color-palette')}</p>

            <div className="mt-4 flex flex-wrap gap-2">
                {predefinedPaletteIds.map((id) => (
                    <button
                        key={id}
                        onClick={() => setPaletteId(id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            paletteId === id ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground hover:bg-border'
                        }`}
                    >
                        <Swatch color={palettes[id].light.primary} />
                        {palettes[id].label}
                    </button>
                ))}
                <button
                    onClick={() => setPaletteId('custom')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        paletteId === 'custom' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground hover:bg-border'
                    }`}
                >
                    {t('settings.color-palette-custom')}
                </button>
            </div>

            {paletteId === 'custom' && <CustomEditor />}
        </div>
    );
}
