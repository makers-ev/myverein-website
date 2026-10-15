'use client';

import { useId } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { addOption, canMove, type FieldOption, MAX_OPTIONS, moveItem, renameOption } from '@/lib/formEditor';

/**
 * List of options of a choice field (form editor and custom field definitions). Only the label is typed; the stored value is
 * derived from it (`Rot` -> `rot`) and stays fixed once it was published (`lockedValues`). Reorder with up/down buttons.
 */
export default function OptionsEditor({
    options,
    onChange,
    lockedValues,
    protectLocked = false,
    error,
}: {
    options: readonly FieldOption[];
    onChange: (next: FieldOption[]) => void;
    /** Values that already exist in a published version / with stored values: their value never follows the label. */
    lockedValues?: ReadonlySet<string>;
    /** Locked options cannot be removed (their value is stored for members): the button is disabled and the reason is announced. */
    protectLocked?: boolean;
    error?: string | null;
}) {
    const { t } = useLanguage();
    const id = useId();
    const locked = lockedValues ?? new Set<string>();
    return (
        <div>
            {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('forms.editor.options.empty')}</p>
            ) : (
                <ol className="space-y-2">
                    {options.map((option, index) => (
                        <li key={option.uid ?? index} className="flex items-center gap-1.5">
                            <input
                                value={option.label}
                                maxLength={200}
                                aria-label={t('forms.editor.options.label', { number: index + 1 })}
                                aria-invalid={option.label.trim() === '' ? true : undefined}
                                aria-describedby={error ? `${id}-err` : undefined}
                                onChange={(e) => onChange(renameOption(options, index, e.target.value, locked))}
                                className={inputClass}
                            />
                            <button
                                type="button"
                                disabled={!canMove(index, options.length, 'up')}
                                onClick={() => onChange(moveItem(options, index, 'up'))}
                                aria-label={t('forms.editor.options.up', { number: index + 1 })}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            >
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                disabled={!canMove(index, options.length, 'down')}
                                onClick={() => onChange(moveItem(options, index, 'down'))}
                                aria-label={t('forms.editor.options.down', { number: index + 1 })}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            >
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                disabled={protectLocked && locked.has(option.value)}
                                title={protectLocked && locked.has(option.value) ? t('forms.cf.options.protected') : undefined}
                                onClick={() => onChange(options.filter((_, i) => i !== index))}
                                aria-label={protectLocked && locked.has(option.value) ? t('forms.cf.options.removeProtected', { number: index + 1 }) : t('forms.editor.options.remove', { number: index + 1 })}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ol>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
                <button type="button" disabled={options.length >= MAX_OPTIONS} onClick={() => onChange(addOption(options))} className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('forms.editor.options.add')}
                </button>
                <span className="text-xs text-muted-foreground">{t('forms.editor.options.count', { count: options.length, max: MAX_OPTIONS })}</span>
            </div>
            {error && (
                <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
