'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

/**
 * Global light/dark switch. `next-themes` only knows the real theme after
 * mount (it reads localStorage/system preference client-side) -- rendering
 * anything theme-dependent before that would itself cause a hydration
 * mismatch, so this renders a neutral placeholder button until mounted,
 * same "wait for mount" pattern next-themes' own docs recommend.
 */
export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Classic SSR-hydration guard: next-themes only knows the real theme
        // after mount, so this flips a flag once mounted rather than syncing
        // external state -- the documented exception for this rule.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-9 w-9 rounded-md" aria-hidden="true" />;
    }

    const isDark = resolvedTheme === 'dark';

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
