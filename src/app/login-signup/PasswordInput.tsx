'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>;

/** Password input with a show/hide toggle button inside the field. */
export function PasswordInput(props: PasswordInputProps) {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className="mt-1 block w-full min-h-11 rounded-lg border border-control bg-background px-3 py-2 pr-11 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t('auth.password.hide') : t('auth.password.show')}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 mt-1 flex min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
                {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    );
}
