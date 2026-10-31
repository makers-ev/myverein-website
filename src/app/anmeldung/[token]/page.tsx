import type { Metadata } from 'next';

import GuestRegistration from '@/components/anmeldung/GuestRegistration';
import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../../project.config.json';

// `referrer: no-referrer` (plus the matching header in proxy.ts): the link is a secret, no request may leak it as Referer.
export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Anmeldung - ${title}` }),
    referrer: 'no-referrer',
};

/** Public guest registration for an event (Wave 12 W7): no session, the link token is the proof. */
export default async function Anmeldung({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <GuestRegistration token={token} />;
}
