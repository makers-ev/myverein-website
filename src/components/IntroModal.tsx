'use client';

import { useEffect, useState } from 'react';
import { Rocket, ShieldCheck, ScrollText, type LucideIcon } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from './Modal';

const STEPS: { icon: LucideIcon; key: string }[] = [
  { icon: Rocket, key: 'step1' },
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
          className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition hover:brightness-110"
        >
          {t('intro-modal.button')}
        </button>
      }
    >
      <p className="mb-4 text-muted-foreground">{t('intro-modal.intro')}</p>
      {STEPS.map(({ icon: Icon, key }) => (
        <div key={key} className="mb-4 flex gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <p className="mb-0.5 font-bold text-foreground">{t(`intro-modal.${key}.title`)}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`intro-modal.${key}.text`)}</p>
          </div>
        </div>
      ))}
    </Modal>
  );
}
