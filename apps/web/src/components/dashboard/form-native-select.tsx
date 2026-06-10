'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormNativeSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function FormNativeSelect({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: FormNativeSelectProps): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
