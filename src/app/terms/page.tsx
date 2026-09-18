import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { LegalDocument } from '@/components/LegalDocument';
import { title, description, url, keywords } from '../../../project.config.json';

export const metadata = createSiteMetadata({
    title: `Terms of Service - ${title}`,
    description,
    url: `${url}/terms`,
    keywords: [...keywords, 'terms', 'legal'],
});

export default async function TermsOfServicePage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <LegalDocument keyPrefix="legal.tos" sectionCount={8} />;
}
