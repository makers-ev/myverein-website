'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

/** Quiet way back to the marketing site, under the auth card. */
export default function BackHomeLink() {
    const { t } = useLanguage();
    return (
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t('auth.backHome')}
        </Link>
    );
}
