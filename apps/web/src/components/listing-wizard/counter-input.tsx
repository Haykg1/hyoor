'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CounterInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function CounterInput({
  label,
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  className,
}: CounterInputProps): React.JSX.Element {
  function decrement() {
    const next = Math.max(min, Math.round((value - step) * 10) / 10);
    onChange(next);
  }
  function increment() {
    const next = Math.min(max, Math.round((value + step) * 10) / 10);
    onChange(next);
  }
  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={decrement}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">{value}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={increment}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
