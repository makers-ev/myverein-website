import type { Metadata } from 'next';

import GuestConfirm from '@/components/anmeldung/GuestConfirm';
import { createNoIndexMetadata } from '@/seo/createNoIndexMetadata';
import { title } from '../../../../../project.config.json';

export const metadata: Metadata = {
    ...createNoIndexMetadata({ title: `Anmeldung bestätigen - ${title}` }),
    referrer: 'no-referrer',
};

/** Link of the confirmation mail of a guest registration (Wave 12 W7). The code is used only after a click. */
export default async function AnmeldungBestaetigen({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    return <GuestConfirm code={code} />;
}
