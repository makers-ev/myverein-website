'use client';

import { useEffect, useId, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import type { WardClub } from '@/lib/familie';

import { inputClass, labelClass } from './calendarTypes';
import MemberPicker from './MemberPicker';

/** `clubMemberId: null` = the caller. */
export interface Actor {
    clubMemberId: string | null;
    name: string;
}

export const SELF: Actor = { clubMemberId: null, name: '' };

type WardList = Array<{ id: string; name: string }>;
// One request per club for all panels of the dialog (registration, helpers, rides); a failed request is not cached.
const wardCache = new Map<string, { at: number; promise: Promise<WardList> }>();
const WARD_TTL_MS = 60_000;

function loadWards(clubId: string): Promise<WardList> {
    const hit = wardCache.get(clubId);
    if (hit && Date.now() - hit.at < WARD_TTL_MS) return hit.promise;
    const promise = apiFetch<{ data: WardClub[] }>('/my-wards').then((res) => res.data.filter((c) => c.clubId === clubId).flatMap((c) => c.wards.map((w) => ({ id: w.wardId, name: w.name }))));
    wardCache.set(clubId, { at: Date.now(), promise });
    promise.catch(() => wardCache.delete(clubId));
    return promise;
}

/** Wards (children without an own account) of the caller in this club. */
export function useWards(clubId: string): WardList {
    const [wards, setWards] = useState<WardList>([]);
    useEffect(() => {
        let alive = true;
        loadWards(clubId)
            .then((list) => alive && setWards(list))
            .catch(() => alive && setWards([]));
        return () => {
            alive = false;
        };
    }, [clubId]);
    return wards;
}

interface Props {
    clubId: string;
    wards: Array<{ id: string; name: string }>;
    /** Organisers (`members:write` / `helpers:write`) may act for any member. */
    canPickAny: boolean;
    value: Actor;
    onChange: (actor: Actor) => void;
    label: string;
}

/** "Für: Mich / Mein Kind / anderes Mitglied" selector; renders nothing when the caller can only act for themselves. */
export default function ActingFor({ clubId, wards, canPickAny, value, onChange, label }: Props) {
    const { t } = useLanguage();
    const id = useId();
    if (wards.length === 0 && !canPickAny) return null;
    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <select
                id={id}
                value={value.clubMemberId ?? ''}
                onChange={(e) => {
                    const v = e.target.value;
                    const ward = wards.find((w) => w.id === v);
                    onChange(v ? { clubMemberId: v, name: ward?.name ?? value.name } : SELF);
                }}
                className={inputClass}
            >
                <option value="">{t('register.for.me')}</option>
                {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                        {t('register.for.child', { name: w.name })}
                    </option>
                ))}
                {value.clubMemberId && !wards.some((w) => w.id === value.clubMemberId) && <option value={value.clubMemberId}>{value.name}</option>}
            </select>
            {canPickAny && (
                <div className="mt-2">
                    <MemberPicker clubId={clubId} label={t('register.for.member')} onPick={(m) => onChange({ clubMemberId: m.id, name: m.name })} />
                </div>
            )}
        </div>
    );
}
