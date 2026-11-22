import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';

import ClubSearchPage from '@/components/publicClub/ClubSearchPage';
import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, url, keywords } from '../../../project.config.json';

const description = 'Finde deinen Verein auf MyVerein: nach Name oder Ort suchen, die Vereinsseite ansehen und direkt beitreten.';

const base = createSiteMetadata({
    title: `Vereinssuche - ${title}`,
    description,
    url: `${url}/vereinssuche`,
    keywords: [...keywords, 'Vereinssuche', 'Verein finden', 'Verein beitreten'],
});

// The bare page is indexable (and in the sitemap); a search with parameters is a private-ish result view and stays out of the index.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
    const sp = await searchParams;
    return sp.q || sp.ort ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function ClubSearchRoute() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return (
        <Suspense fallback={<div className="min-h-[70vh]" aria-hidden />}>
            <ClubSearchPage />
        </Suspense>
    );
}
