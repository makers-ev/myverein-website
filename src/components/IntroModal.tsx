'use client';

import { useEffect, useState } from 'react';
import { Home, ShieldCheck, ScrollText, type LucideIcon } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from './Modal';

const STEPS: { icon: LucideIcon; key: string }[] = [
  { icon: Home, key: 'step1' },
  { icon: ShieldCheck, key: 'step2' },
  { icon: ScrollText, key: 'step3' },
];

const INTRO_SEEN_KEY = 'intro-seen';

/**
 * First-visit "what is this app" walkthrough, mounted once inside
 * `(protected)/layout.tsx` so it covers every authenticated page. Same
 * `localStorage` + custom-event-to-reopen pattern as `CookieConsent.tsx` --
 * Settings dispatches `'open-intro'` to replay it.
 */
export default function IntroModal() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(INTRO_SEEN_KEY)) {
      // localStorage is a browser-only API, unavailable during SSR -- this can only run after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
    }

    const handleOpenIntro = () => setIsVisible(true);
    window.addEventListener('open-intro', handleOpenIntro);
    return () => window.removeEventListener('open-intro', handleOpenIntro);
  }, []);

  const handleClose = () => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setIsVisible(false);
  };

  return (
    <Modal
      open={isVisible}
      onClose={handleClose}
      title={t('intro-modal.title')}
      footer={
        <button
          onClick={handleClose}
          className="min-h-11 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
        >
          {t('intro-modal.button')}
        </button>
      }
    >
      <p className="mb-6 text-muted-foreground">{t('intro-modal.intro')}</p>
      {STEPS.map(({ icon: Icon, key }) => (
        <div key={key} className="mb-5 flex gap-3 last:mb-0">
          <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="mb-0.5 font-medium text-foreground">{t(`intro-modal.${key}.title`)}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`intro-modal.${key}.text`)}</p>
          </div>
        </div>
      ))}
    </Modal>
  );
}
