import type { Metadata } from 'next';

import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../project.config.json';

import UnsubscribeContent from './UnsubscribeContent';

// `referrer: no-referrer` (plus the matching header in proxy.ts): the page is opened with a secret token in its URL, so
// no request it makes may leak that URL as Referer.
export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Abmelden - ${title}` }),
    referrer: 'no-referrer',
};

/**
 * Landing page of the "Abmelden" link in club e-mails (`/abmelden?token=...`, Wave 9 W4). Public: no login needed, the
 * signed token is the proof. An invalid or expired token only ever shows one neutral message.
 */
export default function Abmelden() {
    return <UnsubscribeContent />;
}
