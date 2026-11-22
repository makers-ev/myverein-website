import type { Metadata } from 'next';

import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../../project.config.json';

import ExternalInvitationContent from './ExternalInvitationContent';

// `referrer: no-referrer` (plus the matching header in proxy.ts, which covers every `/einladung/*` path): the page is opened with the
// token in its URL, so no request it makes may leak that URL as Referer.
export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Einladung - ${title}` }),
    referrer: 'no-referrer',
};

/**
 * Landing page of the invitation mail for external logins (`/einladung/extern?token=...`, Wave 15): sponsors and service providers.
 * Public route: the page decides whether a session exists and sends guests to sign in / sign up first. The token is handled client-side only.
 */
export default function ExternalInvitation() {
    return <ExternalInvitationContent />;
}
