'use client';

import type { AiSearchUiMessage } from '@/hooks/use-ai-search-chat';
import { cn } from '@/lib/utils';

interface AiSearchMessageProps {
  message: AiSearchUiMessage;
}

export function AiSearchMessage({ message }: AiSearchMessageProps): React.JSX.Element {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border/60 bg-muted/50 text-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
