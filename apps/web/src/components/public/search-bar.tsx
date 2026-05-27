'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  variant?: 'compact' | 'large';
  className?: string;
}

export function SearchBar({ variant = 'compact', className }: SearchBarProps): React.JSX.Element {
  const t = useTranslations('search');
  const router = useRouter();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState<number>(1);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 0) params.set('guests', String(guests));
    const query = params.toString();
    router.push(query ? `/properties?${query}` : '/properties');
  }

  const isLarge = variant === 'large';
  const segmentBase = cn(
    'flex min-w-0 flex-col gap-0.5 text-left transition-colors hover:bg-muted/60 focus-within:bg-muted/60',
    isLarge ? 'px-5 py-2.5' : 'px-3 py-1.5',
  );
  const labelClass = cn(
    'truncate font-semibold uppercase tracking-wider text-muted-foreground',
    isLarge ? 'text-[11px]' : 'text-[10px]',
  );
  const inputClass = cn(
    'w-full truncate border-none bg-transparent p-0 font-medium text-foreground outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0',
    isLarge ? 'text-sm' : 'text-[13px]',
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-stretch rounded-full border border-border bg-card text-foreground shadow-card',
        isLarge ? 'h-16 w-full max-w-3xl' : 'h-12 w-full max-w-xl',
        className,
      )}
    >
      {/* Where */}
      <label className={cn(segmentBase, 'flex-[1.6] rounded-l-full')}>
        <span className={labelClass}>{t('where')}</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('where_placeholder')}
          className={inputClass}
        />
      </label>

      <div className="w-px self-stretch bg-border" />

      {/* Dates — single segment opening a DateRangePicker popover */}
      <div className={cn(segmentBase, 'flex-[1.4]')}>
        <span className={labelClass}>
          {t('check_in')} – {t('check_out')}
        </span>
        <DateRangePicker
          from={checkIn}
          to={checkOut}
          placeholder={t('add_dates')}
          numberOfMonths={2}
          align="center"
          onSelect={(from, to) => {
            setCheckIn(from);
            setCheckOut(to);
          }}
          triggerClassName={cn(
            'h-auto px-0 py-0 text-left hover:bg-transparent',
            inputClass,
            checkIn ? 'text-foreground' : 'text-muted-foreground',
          )}
        />
      </div>

      <div className="w-px self-stretch bg-border" />

      {/* Guests */}
      <label className={cn(segmentBase, isLarge ? 'w-28' : 'w-20')}>
        <span className={labelClass}>{t('guests')}</span>
        <input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className={inputClass}
        />
      </label>

      <div className="flex items-center pr-1.5">
        <Button
          type="submit"
          aria-label={t('search')}
          className={cn('shrink-0 rounded-full p-0', isLarge ? 'h-12 gap-2 px-5' : 'h-9 w-9')}
        >
          <Search className={cn(isLarge ? 'h-5 w-5' : 'h-4 w-4')} />
          {isLarge ? <span>{t('search')}</span> : null}
        </Button>
      </div>
    </form>
  );
}
