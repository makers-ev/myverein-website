'use client';

import { CircleHelp } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { docsTopicUrl, type DocsTopic } from '@/lib/docs';

/** Small "?" next to a page title that opens the matching docs page in a new tab. */
export default function HelpLink({ topic, className = '' }: { topic: DocsTopic; className?: string }) {
    const { t } = useLanguage();
    return (
        <a
            href={docsTopicUrl(topic)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('help.page.label')}
            title={t('help.page.label')}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className}`}
        >
            <CircleHelp aria-hidden="true" className="h-5 w-5" />
        </a>
    );
}
