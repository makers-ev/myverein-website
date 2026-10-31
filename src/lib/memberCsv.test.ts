import { describe, expect, it, vi } from 'vitest';

// api-client/auth-client pull in the Better Auth client (env); the pure helpers need neither.
vi.mock('./api-client', () => ({
    ApiError: class ApiError extends Error {
        constructor(
            readonly status: number,
            readonly code: string,
            message: string,
            readonly details?: unknown,
        ) {
            super(message);
        }
    },
}));
vi.mock('./auth-client', () => ({ backendUrl: 'http://backend.test' }));

import { ApiError } from './api-client';
import {
    buildExportQuery,
    customExportColumn,
    decodeCsvBytes,
    exportableCustomFields,
    headerConflicts,
    importVoidCode,
    isRateLimited,
    canMapHeader,
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
        { header: 'Ort', field: null },
    ];

    it('sends only real overrides, keyed by heading', () => {
        expect(mappingPayload(columns, [])).toBeUndefined();
        expect(mappingPayload(columns, ['', '', ''])).toBeUndefined();
        expect(mappingPayload(columns, ['', 'lastName', 'ignore', '', ])).toEqual({ Familienname: 'lastName', Ort: 'ignore' });
        expect(mappingPayload(columns, ['bogus'])).toBeUndefined();
        const hostile = mappingPayload([{ header: '__proto__', field: null }], ['city']);
        expect(Object.keys(hostile ?? {})).toEqual(['__proto__']);
    });

    it('does not send headings the backend would reject', () => {
        const long = 'x'.repeat(201);
        expect(canMapHeader(long)).toBe(false);
        expect(mappingPayload([{ header: long, field: null }], ['city'])).toBeUndefined();
    });

    it('resolves the effective field against the automatic baseline', () => {
        expect(effectiveField(columns[0]!, undefined)).toBe('lastName');
        expect(effectiveField(columns[1]!, 'lastName')).toBe('lastName');
        expect(effectiveField(columns[2]!, 'ignore')).toBeNull();
    });

    it('reports fields filled by more than one column', () => {
        expect(mappingConflicts(columns, [])).toEqual([]);
        expect(mappingConflicts(columns, ['', 'lastName'])).toEqual(['lastName']);
        expect(mappingConflicts(columns, ['ignore', 'lastName'])).toEqual([]);
    });

    it('flags equal headings with different overrides', () => {
        expect(headerConflicts(columns, ['', '', 'city', 'ignore'])).toEqual(['Ort']);
        expect(headerConflicts(columns, ['', '', 'city', 'city'])).toEqual([]);
    });

    it('detects a changed mapping', () => {
        expect(mappingChanged(columns, [], ['', ''])).toBe(false);
        expect(mappingChanged(columns, [], ['', '', 'ignore'])).toBe(true);
    });
});

describe('commit failures and decoding', () => {
    it('recognises the errors that void a dry-run report', () => {
        expect(importVoidCode(new ApiError(422, 'X', 'm', { code: 'import_has_errors' }))).toBe('import_has_errors');
        expect(importVoidCode(new ApiError(409, 'X', 'm', { code: 'import_already_applied' }))).toBe('import_already_applied');
        expect(importVoidCode(new ApiError(422, 'X', 'm', { code: 'csv_empty' }))).toBeNull();
        expect(importVoidCode(new Error('x'))).toBeNull();
        expect(isRateLimited(new ApiError(429, 'X', 'm'))).toBe(true);
        expect(isRateLimited(new ApiError(422, 'X', 'm'))).toBe(false);
    });

    it('accepts UTF-8 with or without BOM', () => {
        const enc = new TextEncoder();
        expect(decodeCsvBytes(enc.encode('Name;Ort\nJürgen;Köln').buffer as ArrayBuffer)).toEqual({ text: 'Name;Ort\nJürgen;Köln' });
        const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode('Name')]);
        expect(decodeCsvBytes(withBom.buffer)).toEqual({ text: 'Name' });
    });

    it('refuses Windows-1252, UTF-16 and oversized files', () => {
        // "Müller" in Windows-1252: 0xFC is not valid UTF-8.
        expect(decodeCsvBytes(new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]).buffer)).toEqual({ error: 'encoding' });
        expect(decodeCsvBytes(new Uint8Array([0xff, 0xfe, 0x4e, 0x00]).buffer)).toEqual({ error: 'encoding' });
        expect(decodeCsvBytes(new Uint8Array([0x4e, 0x00, 0x61]).buffer)).toEqual({ error: 'encoding' });
        expect(decodeCsvBytes(new ArrayBuffer(1_048_577))).toEqual({ error: 'too_large' });
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

    it('appends custom fields as cf:<key> columns after the standard ones', () => {
        const filters = { status: '', category: '', departmentId: '', includeFormer: false };
        const q = new URLSearchParams(buildExportQuery('club1', ['displayName'], filters, false, ['trikot', 'Bad Key', 'trikot', 'groesse']));
        expect(q.get('columns')).toBe('displayName,cf:trikot,cf:groesse');
        expect(new URLSearchParams(buildExportQuery('club1', ['displayName'], filters, false)).get('columns')).toBe('displayName');
    });

    it('offers only live custom fields the exporter may read', () => {
        expect(customExportColumn('trikot')).toBe('cf:trikot');
        expect(customExportColumn('Trikot')).toBeNull();
        const defs = [
            { key: 'trikot', archived: false, sensitive: false },
            { key: 'allergie', archived: false, sensitive: true },
            { key: 'alt', archived: true, sensitive: false },
        ];
        expect(exportableCustomFields(defs, false).map((d) => d.key)).toEqual(['trikot']);
        expect(exportableCustomFields(defs, true).map((d) => d.key)).toEqual(['trikot', 'allergie']);
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
