import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { LegalDocument } from '@/components/LegalDocument';
import { title, description, url, keywords } from '../../../project.config.json';

export const metadata = createSiteMetadata({
    title: `Imprint - ${title}`,
    description,
    url: `${url}/imprint`,
    keywords: [...keywords, 'imprint', 'legal'],
});

export default async function ImprintPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <LegalDocument keyPrefix="legal.imprint" sectionCount={4} />;
}
