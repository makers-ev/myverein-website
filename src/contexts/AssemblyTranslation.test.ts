import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import AssemblyTranslation from './AssemblyTranslation';

const de = AssemblyTranslation.de ?? {};
const en = AssemblyTranslation.en ?? {};
const placeholders = (v: string) => (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

const root = join(__dirname, '..');
const sources = [
    ...readdirSync(join(root, 'components/assembly')).filter((f) => f.endsWith('.tsx')).map((f) => join(root, 'components/assembly', f)),
    join(root, 'app/pageContent/Abstimmungen.tsx'),
    join(root, 'lib/assembly.ts'),
];

describe('AssemblyTranslation', () => {
    it('has the same keys in German and English', () => {
        expect(Object.keys(en).filter((k) => !(k in de))).toEqual([]);
        expect(Object.keys(de).filter((k) => !(k in en))).toEqual([]);
    });

    it('uses the same placeholders in both languages', () => {
        for (const key of Object.keys(de)) expect(placeholders(en[key] ?? ''), key).toBe(placeholders(de[key]!));
    });

    it('defines every static assembly.* key the components use', () => {
        const missing = new Set<string>();
        for (const file of sources) {
            const text = readFileSync(file, 'utf8');
            for (const m of text.matchAll(/['"`](assembly\.[A-Za-z0-9_.]+)['"`]/g)) {
                if (!(m[1]! in de)) missing.add(`${m[1]} (${file.split('/').pop()})`);
            }
        }
        expect([...missing]).toEqual([]);
    });

    it('defines every value of the dynamic key families', () => {
        const families: Record<string, string[]> = {
            'assembly.majority': ['einfach', 'absolut', 'zwei_drittel', 'drei_viertel', 'einstimmig'],
            'assembly.topic': ['allgemein', 'satzungsaenderung', 'zweckaenderung', 'wahl', 'entlastung', 'aufloesung'],
            'assembly.ballot.status': ['draft', 'open', 'closed', 'counted', 'finalized', 'cancelled'],
            'assembly.election.status': ['planned', 'running', 'decided', 'closed'],
            'assembly.candidate': ['proposed', 'willing', 'declined', 'withdrawn', 'elected', 'accepted', 'pending_account'],
            'assembly.minutes.status': ['entwurf', 'zur_genehmigung', 'genehmigt', 'archiviert'],
            'assembly.minutes.role': ['leitung', 'schriftfuehrung'],
            'assembly.delivery': ['queued', 'sent', 'failed', 'bounced', 'manual_posted'],
            'assembly.channel': ['email', 'inapp', 'post'],
            'assembly.voteKind': ['none', 'resolution', 'election'],
            'assembly.quorum': ['beschlussfaehig', 'nicht_beschlussfaehig', 'regeln_fehlen'],
            'assembly.outcome': ['angenommen', 'abgelehnt', 'nicht_beschlussfaehig', 'entschieden', 'gleichstand', 'kein_ergebnis', 'none'],
            'assembly.basis': ['ok', 'rules_missing', 'not_yet_member', 'left', 'status', 'no_category', 'category', 'birth_date_unknown', 'min_age', 'override', 'none'],
            'assembly.participation': ['praesenz', 'hybrid', 'virtual'],
            'assembly.online.member': ['hybrid', 'virtual'],
            'assembly.manage.tab': ['planen', 'durchfuehrung', 'protokoll'],
            'assembly.page.tab': ['abstimmungen', 'umlauf', 'wahlen'],
            'assembly.abstain': ['not_counted', 'against'],
            'assembly.invitationForm': ['textform', 'schriftlich'],
            'assembly.quorumMode': ['none', 'fraction', 'absolute'],
            'assembly.termEffect': ['none', 'suspend_permissions'],
            'assembly.votingStatus': ['probe', 'aktiv', 'ruhend'],
            'assembly.deliveryReason': ['no_address', 'email_failed', 'dispatch_failed', 'shared_address', 'other'],
            'assembly.rule': [
                'invitationMinDays', 'invitationDeliveryBufferDays', 'invitationForm', 'agendaRequiredInInvitation', 'quorumMode', 'quorumValue', 'majorityByTopic.allgemein', 'abstainCountsAs',
                'proxyAllowed', 'maxProxiesPerPerson', 'onlineAllowed', 'circularAllowed', 'circularMinParticipation', 'circularUnanimity', 'secretBallotDigitalAllowed', 'votingMinAge',
                'votingStatuses', 'termWarningDays', 'termExpiryEffect', 'satzungReference', 'satzungPageSlug',
            ],
        };
        const missing: string[] = [];
        for (const [prefix, values] of Object.entries(families)) for (const v of values) if (!(`${prefix}.${v}` in de)) missing.push(`${prefix}.${v}`);
        for (const v of ['online.none', 'online.hybrid', 'online.virtual']) if (!(`assembly.${v}` in de)) missing.push(`assembly.${v}`);
        expect(missing).toEqual([]);
    });

    it('has a message for every error code the helper maps', () => {
        const text = readFileSync(join(root, 'lib/assembly.ts'), 'utf8');
        const block = /const ASSEMBLY_ERROR_CODES = new Set\(\[([\s\S]*?)\]\);/.exec(text)?.[1] ?? '';
        const codes = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
        expect(codes.length).toBeGreaterThan(50);
        expect(codes.filter((c) => !(`assembly.err.${c}` in de))).toEqual([]);
    });
});
