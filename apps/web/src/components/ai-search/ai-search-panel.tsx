'use client';

import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAiSearchChat } from '@/hooks/use-ai-search-chat';
import { useAiSearchQuota } from '@/hooks/use-ai-search-quota';

import { AiSearchCapabilitiesBanner } from './ai-search-capabilities-banner';
import { AiSearchFilterChips } from './ai-search-filter-chips';
import { AiSearchMessage } from './ai-search-message';
import { AiSearchQuotaBanner } from './ai-search-quota-banner';
import { AiSearchResults } from './ai-search-results';

interface AiSearchPanelProps {
  className?: string;
  showHeader?: boolean;
}

export function AiSearchPanel({
  className,
  showHeader = true,
}: AiSearchPanelProps): React.JSX.Element {
  const t = useTranslations('ai_search');
  const { quota, isLoading: isQuotaLoading, refreshQuota } = useAiSearchQuota();
  const { messages, isLoading, sendMessage, clearMessages } = useAiSearchChat(refreshQuota);
  const [input, setInput] = useState('');
  const exhausted = quota !== null && quota.remaining <= 0;
  const bottomRef = useRef<HTMLDivElement>(null);
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
    <div className={className ?? 'flex h-full min-h-0 flex-col'}>
      {showHeader ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold">{t('title')}</h2>
          </div>
          {messages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t('clear')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <AiSearchQuotaBanner quota={quota} isLoading={isQuotaLoading} />
      <AiSearchCapabilitiesBanner />
      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('placeholder_hint')}</p>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <AiSearchMessage message={message} />
              {message.role === 'assistant' && message.filters ? (
                <AiSearchFilterChips filters={message.filters} searchPath={message.searchPath} />
              ) : null}
              {message.role === 'assistant' && message.properties ? (
                <AiSearchResults properties={message.properties} />
              ) : null}
            </div>
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
      <div className="mt-4 shrink-0 space-y-2 border-t border-border pt-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('input_placeholder')}
          rows={2}
          disabled={isLoading || exhausted}
          className="resize-none"
        />
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading || exhausted || !input.trim()}
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
