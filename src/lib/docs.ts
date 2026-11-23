/**
 * Links into the docs portal (Nextra, German pages under `/de/...`). The base origin comes from `NEXT_PUBLIC_DOCS_URL`
 * (inlined at build time), falling back to the production portal.
 */
export const DEFAULT_DOCS_URL = 'https://docs.myverein.lpj.app';

/** Contextual help topics -> docs path (relative to `/de/`). Every value must exist as a directory in the docs repo (docs.test.ts). */
export const DOCS_TOPICS = {
    today: 'handbuch/konto-und-app/startseite-heute',
    members: 'handbuch/mitglieder',
    calendar: 'handbuch/termine-und-anwesenheit',
    announcements: 'handbuch/mitteilungen',
    documents: 'handbuch/dokumente-und-pdf',
    votes: 'handbuch/abstimmungen-und-versammlung',
    places: 'handbuch/material-und-orte',
    privacy: 'handbuch/datenschutz-und-recht',
    family: 'handbuch/familie-und-eltern',
    setup: 'verein-aufsetzen',
} as const;

export type DocsTopic = keyof typeof DOCS_TOPICS;

/** Absolute docs URL for a path below `/de/` (leading/trailing slashes tolerated); no path = docs home. */
export function docsUrl(path = ''): string {
    const base = (process.env.NEXT_PUBLIC_DOCS_URL?.trim() || DEFAULT_DOCS_URL).replace(/\/+$/, '');
    const clean = path.trim().replace(/^\/+|\/+$/g, '');
    return clean ? `${base}/de/${clean}` : `${base}/de`;
}

export const docsTopicUrl = (topic: DocsTopic): string => docsUrl(DOCS_TOPICS[topic]);
