import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import JsonLd from '@/components/seoJsonLd';
import PublicClubView from '@/components/publicClub/PublicClubView';
import PublicUnavailable from '@/components/publicClub/PublicUnavailable';
import { fetchPublicClub, metaDescription, publicClubJsonLd, trustedClientIp } from '@/lib/publicClub';
import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title as siteTitle, url } from '../../../../project.config.json';

// One backend read per request for metadata and page. Never cached across requests: a withdrawn or suspended page must be gone at once.
// The visitor's address (only from the trusted proxy header named in PUBLIC_CLIENT_IP_HEADER) goes to the backend's per-visitor limit.
const load = cache(async (slug: string) => {
    const h = await headers();
    return fetchPublicClub(slug, trustedClientIp((name) => h.get(name)));
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const result = await load(slug);
    // Missing, not public and unavailable all look the same: no title, no description, never indexed.
    if (result.kind !== 'ok') return { title: siteTitle, robots: { index: false, follow: false } };
    const { club } = result;
    const base = createSiteMetadata({
        title: `${club.name}${club.city ? ` - ${club.city}` : ''}`,
        description: metaDescription(club),
        url: `${url}/v/${club.slug}`,
    });
    // Search engines only get an invitation when the club released the page for indexing; the default is a hard noindex.
    return { ...base, robots: club.indexable ? { index: true, follow: true } : { index: false, follow: false } };
}

/**
 * Public club page (Wave 15 W2, no login): server-rendered on every request (no data cache, withdrawal and suspension take effect at once). A club that did not
 * publish the page (or does not exist) yields the same 404. Only released fields are rendered; JSON-LD only for indexable pages.
 */
export default async function PublicClubPage({ params }: Props) {
    const { slug } = await params;
    const result = await load(slug);
    if (result.kind === 'notFound') notFound();
    if (result.kind === 'unavailable') return <PublicUnavailable />;
    // Dynamic rendering (see proxy.ts) makes the request nonce available for the JSON-LD script.
    const nonce = (await headers()).get('x-nonce') ?? undefined;
    return (
        <>
            <PublicClubView club={result.club} />
            {result.club.indexable && <JsonLd json={publicClubJsonLd(result.club, `${url}/v/${result.club.slug}`)} nonce={nonce} />}
        </>
    );
}
