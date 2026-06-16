'use client';

import { Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useHostCalendarAiChat } from '@/hooks/use-host-calendar-ai-chat';
import { useHostCalendarAiQuota } from '@/hooks/use-host-calendar-ai-quota';
import { usePropertyCalendarStore } from '@/store';

import { HostCalendarAiInfoBanner } from './host-calendar-ai-info-banner';
import { HostCalendarAiMessage } from './host-calendar-ai-message';

interface HostCalendarAiPanelProps {
  propertyId: string;
  propertyTitle: string;
}

export function HostCalendarAiPanel({
  propertyId,
  propertyTitle,
}: HostCalendarAiPanelProps): React.JSX.Element {
  const t = useTranslations('dashboard.calendar.ai');
  const { quota, isLoading: isQuotaLoading, refreshQuota } = useHostCalendarAiQuota();
  const monthCursor = usePropertyCalendarStore((s) => s.monthCursor);
  const loadRange = usePropertyCalendarStore((s) => s.loadRange);
  const refreshCalendar = async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const from = toIso(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
    const to = toIso(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 2, 0));
    await loadRange(from, to);
  };
  const {
    messages,
    isLoading,
    isConfirming,
    sendMessage,
    confirmProposal,
    cancelProposal,
    clearMessages,
  } = useHostCalendarAiChat(propertyId, refreshQuota, refreshCalendar);
  const basePricePerNight = usePropertyCalendarStore((s) => s.basePricePerNight);
  const [input, setInput] = useState('');
  const exhausted = quota !== null && quota.remaining <= 0;
  const bottomRef = useRef<HTMLDivElement>(null);
  const welcomeMessage = {
    id: 'welcome',
    role: 'assistant' as const,
    content: t('welcome_message'),
  };
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  async function handleSubmit() {
    const value = input;
    setInput('');
    await sendMessage(value);
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }
  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">{t('title')}</h2>
        </div>
        {messages.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearMessages}>
            <Trash2 className="mr-1 h-4 w-4" />
            {t('clear')}
          </Button>
        ) : null}
      </div>
      <HostCalendarAiInfoBanner
        quota={quota}
        isLoading={isQuotaLoading}
        propertyTitle={propertyTitle}
      />
      <ScrollArea className="mt-3 min-h-0 flex-1 pr-2">
        <div className="space-y-3 pb-3">
          {messages.length === 0 ? (
            <HostCalendarAiMessage
              message={welcomeMessage}
              basePricePerNight={basePricePerNight}
              isConfirming={false}
              onConfirm={() => {}}
              onCancel={() => {}}
            />
          ) : null}
          {messages.map((message) => (
            <HostCalendarAiMessage
              key={message.id}
              message={message}
              basePricePerNight={basePricePerNight}
              isConfirming={isConfirming}
              onConfirm={(entries) => void confirmProposal(message.id, entries)}
              onCancel={() => cancelProposal(message.id)}
            />
          ))}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('thinking')}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="mt-3 shrink-0 space-y-2 border-t border-border pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('input_placeholder')}
          rows={2}
          disabled={isLoading || exhausted || isConfirming}
          className="resize-none"
        />
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading || exhausted || isConfirming || !input.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('thinking')}
            </>
          ) : (
            t('send')
          )}
        </Button>
      </div>
    </div>
  );
}
