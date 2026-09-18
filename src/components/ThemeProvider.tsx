'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Thin wrapper so the rest of the app imports from "@/components/ThemeProvider"
 * instead of "next-themes" directly -- keeps the theming library swappable
 * behind one file, matching this repo's other provider components.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
            {children}
        </NextThemesProvider>
    );
}
