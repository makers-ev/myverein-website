import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../project.config.json';

import InvitationContent from './InvitationContent';

export const metadata = createNoIndexMetadata({
    title: `Einladung - ${title}`,
});

/**
 * Landing page of the invitation mail (`/einladung?token=...`, Wave 7 W3). Public route: the page itself decides
 * whether a session exists and sends guests to `/login-signup` first. The token is handled client-side only.
 */
export default function Einladung() {
    return <InvitationContent />;
}
