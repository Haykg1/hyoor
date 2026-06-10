'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const OPTIONS_LIST_MAX_HEIGHT_CLASS = 'max-h-64';

interface FilterMultiSelectProps {
  label: string;
  placeholder: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function FilterMultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
  className,
}: FilterMultiSelectProps): React.JSX.Element {
  const t = useTranslations('favorites.filters');
  const selectedSet = new Set(selected);
  function toggle(value: string): void {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }
  const triggerLabel =
    selected.length === 0 ? placeholder : t('selected_count', { count: selected.length });
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div
            className={cn(
              'space-y-1 overflow-y-auto overscroll-contain pr-1',
              OPTIONS_LIST_MAX_HEIGHT_CLASS,
            )}
          >
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={selectedSet.has(option)}
                  onCheckedChange={() => toggle(option)}
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
