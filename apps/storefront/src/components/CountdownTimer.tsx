import { useState, useEffect, useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';

function getTimeLeft(target: Date) {
  const now = new Date().getTime();
  const diff = Math.max(target.getTime() - now, 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, total: diff };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export default function CountdownTimer({ endTime, size = 'sm' }: { endTime: number; size?: 'sm' | 'md' | 'lg' | 'overlay' }) {
  const { t } = useTranslation();
  const target = useMemo(() => new Date(endTime), [endTime]);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (timeLeft.total <= 0) return null;

  const items = [
    { label: t('countdown.days', 'أيام'), value: pad(timeLeft.days) },
    { label: t('countdown.hours', 'ساعات'), value: pad(timeLeft.hours) },
    { label: t('countdown.minutes', 'دقائق'), value: pad(timeLeft.minutes) },
    { label: t('countdown.seconds', 'ثواني'), value: pad(timeLeft.seconds) },
  ];

  if (size === 'overlay') {
    return (
      <div className="flex items-center justify-center gap-1" role="timer" aria-label={t('countdown.label', 'العد التنازلي')}>
        <span className="font-medium text-white/70 ms-1" style={{ fontSize: 'var(--badge-compact-font-size, 10px)' }}>{t('countdown.ends', 'ينتهي')}</span>
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-white/30" style={{ fontSize: 'var(--badge-compact-font-size, 10px)' }}>:</span>}
            <span className="min-w-[16px] text-center font-bold text-white tabular-nums leading-none" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>{item.value}</span>
          </span>
        ))}
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="w-full" role="timer" aria-label={t('countdown.label', 'العد التنازلي')}>
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-l from-danger/40 to-transparent" />
          <span className="text-center text-xs font-bold text-danger sm:text-sm">{t('countdown.offerEnds', 'ينتهي العرض خلال')}</span>
          <span className="h-px w-8 bg-gradient-to-r from-danger/40 to-transparent" />
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <Fragment key={item.label}>
              {i > 0 && <span className="h-1 w-1 shrink-0 rounded-full bg-danger/25" />}
              <div className="flex h-[54px] w-[50px] flex-col items-center justify-center rounded-lg border-2 border-danger/30 bg-gradient-to-b from-danger-soft to-danger-soft shadow-card sm:h-[58px] sm:w-[54px]">
          <span className="text-base font-bold leading-none text-danger sm:text-lg">{item.value}</span>
          <span className="mt-0.5 font-medium text-text-secondary sm:text-[var(--badge-compact-font-size)]" style={{ fontSize: '9px' }}>{item.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="flex items-center justify-center gap-1" role="timer" aria-label={t('countdown.label', 'العد التنازلي')}>
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-danger/25" />}
            <div className="flex h-[44px] w-[42px] flex-col items-center justify-center rounded-md border-2 border-danger/25 bg-gradient-to-b from-danger-soft to-danger-soft shadow-card">
              <span className="text-sm font-bold leading-none text-danger">{item.value}</span>
              <span className="mt-[1px] font-medium leading-none text-text-secondary" style={{ fontSize: '8px' }}>{item.label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-px" role="timer" aria-label={t('countdown.label', 'العد التنازلي')}>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span className="h-[2px] w-[2px] shrink-0 rounded-full bg-danger/25" />}
          <div className="flex h-[32px] w-[32px] flex-col items-center justify-center rounded border-2 border-danger/20 bg-gradient-to-b from-danger-soft to-danger-soft shadow-xs">
            <span className="font-bold leading-none text-danger" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>{item.value}</span>
            <span className="mt-px font-medium leading-none text-text-secondary" style={{ fontSize: '8px' }}>{item.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
