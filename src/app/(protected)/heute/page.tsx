import { createNoIndexMetadata } from "@/seo/createNoIndexMetadata";
import { title } from '../../../../project.config.json';

import HeutePageContent from "../../pageContent/Heute";

export const metadata = createNoIndexMetadata({
    title: `Heute - ${title}`,
});

// Dynamic via the (protected) layout's `headers()` call, see kalender/page.tsx.
export default function Heute() {
    return <HeutePageContent />;
}
