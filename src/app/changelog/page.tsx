import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import ChangelogPageContent from './ChangelogPageContent';

export const metadata = createSiteMetadata({
    title: `Changelog - ${title}`,
    description,
    url: `${url}/changelog`,
    keywords: [...keywords, 'changelog', 'releases', 'updates'],
});

export default async function ChangelogPage() {
    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return <ChangelogPageContent />;
}
