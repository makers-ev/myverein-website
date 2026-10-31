import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import RoadmapPageContent from './RoadmapPageContent';

export const metadata = createSiteMetadata({
    title: `Roadmap - ${title}`,
    description,
    url: `${url}/roadmap`,
    keywords: [...keywords, 'roadmap', 'features', 'upcoming'],
});

export default async function RoadmapPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <RoadmapPageContent />;
}
