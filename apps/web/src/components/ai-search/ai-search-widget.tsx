'use client';

import { Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { AiSearchPanel } from './ai-search-panel';

export function AiSearchWidget(): React.JSX.Element | null {
  const t = useTranslations('ai_search');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.includes('/ai-search')) return null;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 gap-2 rounded-full px-5 shadow-lg"
          aria-label={t('open_widget')}
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">{t('widget_label')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="shrink-0 text-left">
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>
        <AiSearchPanel className="flex min-h-0 flex-1 flex-col pt-4" showHeader={false} />
      </SheetContent>
    </Sheet>
  );
}
