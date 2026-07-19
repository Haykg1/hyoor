'use client';

import { CircleHelp } from 'lucide-react';
import type { JSX } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AnalyticsInfoHintProps {
  label: string;
  description: string;
  className?: string;
}

/** Icon that shows a calculation / metric explanation on hover. */
export function AnalyticsInfoHint({
  label,
  description,
  className,
}: AnalyticsInfoHintProps): JSX.Element {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              className,
            )}
            aria-label={label}
          >
            <CircleHelp className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
