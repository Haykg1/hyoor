'use client';

import { CircleHelp } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AnalyticsInfoHintProps {
  label: string;
  description: string;
  className?: string;
}

/** Hover-only info icon. Ignores focus and ignores hover briefly after mount (e.g. dialog open under cursor). */
export function AnalyticsInfoHint({
  label,
  description,
  className,
}: AnalyticsInfoHintProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const hoverArmedRef = useRef(false);
  useEffect(() => {
    hoverArmedRef.current = false;
    setOpen(false);
    const timer = window.setTimeout(() => {
      hoverArmedRef.current = true;
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={() => undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              'inline-flex shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              className,
            )}
            aria-label={label}
            onPointerEnter={() => {
              if (!hoverArmedRef.current) return;
              setOpen(true);
            }}
            onPointerLeave={() => setOpen(false)}
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
