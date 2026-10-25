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

/** Wards (children without an own account) of the caller in this club. */
export function useWards(clubId: string): Array<{ id: string; name: string }> {
    const [wards, setWards] = useState<Array<{ id: string; name: string }>>([]);
    useEffect(() => {
        let alive = true;
        apiFetch<{ data: WardClub[] }>('/my-wards')
            .then((res) => {
                if (!alive) return;
                setWards(res.data.filter((c) => c.clubId === clubId).flatMap((c) => c.wards.map((w) => ({ id: w.wardId, name: w.name }))));
            })
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
