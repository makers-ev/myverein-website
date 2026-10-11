import { describe, expect, it, vi } from 'vitest';

// api-client/auth-client pull in the Better Auth client (env); the pure helpers need neither.
vi.mock('./api-client', () => ({ ApiError: class ApiError extends Error {} }));
vi.mock('./auth-client', () => ({ backendUrl: 'http://backend.test' }));

import {
    buildExportQuery,
    defaultExportColumns,
    effectiveField,
    EXPORT_COLUMNS,
    filenameFromDisposition,
    issueCounts,
    mappingChanged,
    mappingConflicts,
    mappingPayload,
    problemRows,
    selectableColumns,
    stripBom,
    summarizeRows,
    toggleExportColumn,
    utf8Size,
    type ImportRow,
} from './memberCsv';

const rows: ImportRow[] = [
    { line: 2, status: 'ok', issues: [] },
    { line: 3, status: 'error', issues: [{ field: 'birthDate', code: 'invalid_date' }, { field: 'contactEmail', code: 'invalid_email' }] },
    { line: 4, status: 'duplicate', issues: [], duplicates: [{ reason: 'email', clubMemberId: null, line: 2 }] },
    { line: 5, status: 'error', issues: [{ field: 'birthDate', code: 'invalid_date' }] },
];

describe('import report', () => {
    it('summarises rows by status', () => {
        expect(summarizeRows(rows)).toEqual({ rows: 4, ok: 1, duplicates: 1, errors: 2 });
        expect(summarizeRows([])).toEqual({ rows: 0, ok: 0, duplicates: 0, errors: 0 });
    });

    it('keeps only rows that need attention, in file order', () => {
        expect(problemRows(rows).map((r) => r.line)).toEqual([3, 4, 5]);
    });

    it('counts issue codes, most frequent first', () => {
        expect(issueCounts(rows)).toEqual([
            { code: 'invalid_date', count: 2 },
            { code: 'invalid_email', count: 1 },
        ]);
    });

    it('strips a byte order mark and measures UTF-8 bytes', () => {
        expect(stripBom('﻿Name;Ort')).toBe('Name;Ort');
        expect(stripBom('Name')).toBe('Name');
        expect(utf8Size('äö')).toBe(4);
    });
});

describe('column mapping', () => {
    const columns = [
        { header: 'Nachname', field: 'lastName' },
        { header: 'Familienname', field: null },
        { header: 'Ort', field: 'city' },
    ];

    it('sends only real overrides', () => {
        expect(mappingPayload({})).toBeUndefined();
        expect(mappingPayload({ Familienname: '' })).toBeUndefined();
        expect(mappingPayload({ Familienname: 'lastName', Ort: 'ignore', Foo: 'notAField' })).toEqual({ Familienname: 'lastName', Ort: 'ignore' });
        const hostile = mappingPayload({ ['__proto__']: 'city' });
        expect(Object.keys(hostile ?? {})).toEqual(['__proto__']);
    });

    it('resolves the effective field of a column', () => {
        expect(effectiveField(columns[0]!, {})).toBe('lastName');
        expect(effectiveField(columns[1]!, { Familienname: 'lastName' })).toBe('lastName');
        expect(effectiveField(columns[2]!, { Ort: 'ignore' })).toBeNull();
    });

    it('reports fields filled by more than one column', () => {
        expect(mappingConflicts(columns, {})).toEqual([]);
        expect(mappingConflicts(columns, { Familienname: 'lastName' })).toEqual(['lastName']);
        expect(mappingConflicts(columns, { Nachname: 'ignore', Familienname: 'lastName' })).toEqual([]);
    });

    it('detects a changed mapping', () => {
        expect(mappingChanged({}, { Ort: '' })).toBe(false);
        expect(mappingChanged({}, { Ort: 'ignore' })).toBe(true);
    });
});

describe('export columns', () => {
    it('offers sensitive columns only with read_sensitive', () => {
        const plain = selectableColumns(false);
        expect(plain).toContain('displayName');
        expect(plain).not.toContain('birthDate');
        expect(plain).not.toContain('accountEmail');
        expect(selectableColumns(true)).toHaveLength(EXPORT_COLUMNS.length);
        expect(defaultExportColumns(false)).toEqual(plain);
    });

    it('toggles in canonical order and refuses sensitive columns without the right', () => {
        expect(toggleExportColumn(['city', 'displayName'], 'displayName', true)).toEqual(['city']);
        expect(toggleExportColumn(['city'], 'displayName', true)).toEqual(['displayName', 'city']);
        expect(toggleExportColumn(['displayName'], 'birthDate', false)).toEqual(['displayName']);
        expect(toggleExportColumn(['displayName', 'birthDate'], 'status', false)).toEqual(['displayName', 'status']);
    });

    it('builds the export query with filters', () => {
        const q = new URLSearchParams(buildExportQuery('club1', ['status', 'displayName', 'birthDate'], { status: 'aktiv', category: 'jugend', departmentId: '', includeFormer: true }, false));
        expect(q.get('clubId')).toBe('club1');
        expect(q.get('columns')).toBe('displayName,status');
        expect(q.get('status')).toBe('aktiv');
        expect(q.get('category')).toBe('jugend');
        expect(q.has('departmentId')).toBe(false);
        expect(q.get('includeFormer')).toBe('true');
    });
});

describe('filenameFromDisposition', () => {
    it('reads and sanitises the file name', () => {
        expect(filenameFromDisposition('attachment; filename="mitglieder-2026-10-11.csv"', 'x.csv')).toBe('mitglieder-2026-10-11.csv');
        expect(filenameFromDisposition('attachment; filename="../../evil.csv"', 'x.csv')).toBe('.._.._evil.csv'.replace(/^\.+/, ''));
        expect(filenameFromDisposition(null, 'x.csv')).toBe('x.csv');
        expect(filenameFromDisposition('attachment', 'x.csv')).toBe('x.csv');
    });
});
