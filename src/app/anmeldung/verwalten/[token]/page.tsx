import type { Metadata } from 'next';

import GuestManage from '@/components/anmeldung/GuestManage';
import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../../../project.config.json';

export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Anmeldung verwalten - ${title}` }),
    referrer: 'no-referrer',
};

/** Management link of a guest registration (Wave 12 W7): change party size and answers or cancel. */
export default async function AnmeldungVerwalten({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <GuestManage token={token} />;
}
