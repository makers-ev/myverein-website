import { createNoIndexMetadata } from "@/seo/createNoIndexMetadata";
import { title } from '../../../../project.config.json';

import KalenderPageContent from "../../pageContent/Kalender";

export const metadata = createNoIndexMetadata({
    title: `Kalender - ${title}`,
});

// No `connection()` call needed here -- the (protected) layout above this
// page already calls `headers()`, which opts the whole route into dynamic
// rendering (see src/app/(protected)/layout.tsx).
export default function Kalender() {
    return <KalenderPageContent />;
}
