import type { Metadata } from 'next';

import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../project.config.json';

import InvitationContent from './InvitationContent';

// `referrer: no-referrer` (plus the matching header in proxy.ts): the page is opened with the token in its URL, so no
// request it makes may leak that URL as Referer.
export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Einladung - ${title}` }),
    referrer: 'no-referrer',
};

/**
 * Landing page of the invitation mail (`/einladung?token=...`, Wave 7 W3). Public route: the page itself decides
 * whether a session exists and sends guests to `/login-signup` first. The token is handled client-side only.
 */
export default function Einladung() {
    return <InvitationContent />;
}
