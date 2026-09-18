'use client';

import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Next.js App Router's special file for unmatched routes -- renders inside
 * the root layout (so LanguageProvider/nav/footer stay intact) for any URL
 * that doesn't match a page, plus wherever `notFound()` is called explicitly.
 * Same card layout as /error, /verify-email, /reset-password for a
 * consistent "landed on a dead link" family of pages.
 */
export default function NotFound() {
    const { t } = useLanguage();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-8 shadow-xl transition-all duration-500 hover:shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 rounded-full bg-muted p-4">
                        <MagnifyingGlassIcon className="h-12 w-12 text-muted-foreground" />
                    </div>

                    <h1 className="mb-2 text-3xl font-bold text-card-foreground">{t('notFound.title')}</h1>

                    <p className="mb-8 text-lg text-muted-foreground">{t('notFound.subtitle')}</p>

                    <Link
                        href="/"
                        className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-1 hover:brightness-110 active:scale-95"
                    >
                        {t('notFound.cta')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
