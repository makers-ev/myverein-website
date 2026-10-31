import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import AboutPageContent from './AboutPageContent';

export const metadata = createSiteMetadata({
    title: `About - ${title}`,
    description,
    url: `${url}/about`,
    keywords: [...keywords, 'about', 'über uns', 'makers e.v.'],
});

export default async function AboutPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <AboutPageContent />;
}
