import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import FeaturesPageContent from './FeaturesPageContent';

export const metadata = createSiteMetadata({
    title: `Features - ${title}`,
    description,
    url: `${url}/features`,
    keywords: [...keywords, 'features', 'funktionen'],
});

export default async function FeaturesPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <FeaturesPageContent />;
}
