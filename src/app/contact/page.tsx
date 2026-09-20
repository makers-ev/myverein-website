import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import ContactForm from './ContactForm';

export const metadata = createSiteMetadata({
    title: `Contact - ${title}`,
    description,
    url: `${url}/contact`,
    keywords: [...keywords, 'contact', 'support'],
});

export default async function ContactPage() {
    // Contact page hidden on the public-only site; remove this line to re-enable.
    notFound();

    // Forces dynamic rendering so the proxy's per-request CSP nonce applies -- see login-signup/page.tsx.
    await connection();

    return (
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
            <ContactForm />
        </div>
    );
}
