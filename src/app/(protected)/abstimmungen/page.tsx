import { Suspense } from "react";
import { createNoIndexMetadata } from "@/seo/createNoIndexMetadata";
import { title } from '../../../../project.config.json';

import AbstimmungenPageContent from "../../pageContent/Abstimmungen";

export const metadata = createNoIndexMetadata({
    title: `Abstimmungen - ${title}`,
});

// No `connection()` call needed here -- the (protected) layout above this
// page already calls `headers()`, which opts the whole route into dynamic
// rendering (see src/app/(protected)/layout.tsx).
export default function Abstimmungen() {
    // useSearchParams ("Neuwahl planen" deep link) needs a Suspense boundary.
    return (
        <Suspense>
            <AbstimmungenPageContent />
        </Suspense>
    );
}
