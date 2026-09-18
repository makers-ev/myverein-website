import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { LegalDocument } from '@/components/LegalDocument';
import { title, description, url, keywords } from '../../../project.config.json';

export const metadata = createSiteMetadata({
    title: `Privacy Policy - ${title}`,
    description,
    url: `${url}/privacy`,
    keywords: [...keywords, 'privacy', 'legal'],
});

export default async function PrivacyPolicyPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <LegalDocument keyPrefix="legal.privacy" sectionCount={7} />;
}
