'use client';

import type { HostCalendarUiMessage } from '@/hooks/use-host-calendar-ai-chat';

import { HostCalendarAppliedCard } from './host-calendar-applied-card';
import { HostCalendarChangePreview } from './host-calendar-change-preview';

interface HostCalendarAiMessageProps {
  message: HostCalendarUiMessage;
  basePricePerNight: number;
  isConfirming: boolean;
  onConfirm: (entries: NonNullable<HostCalendarUiMessage['proposedChanges']>['entries']) => void;
  onCancel: () => void;
}

export function HostCalendarAiMessage({
  message,
  basePricePerNight,
  isConfirming,
  onConfirm,
  onCancel,
}: HostCalendarAiMessageProps): React.JSX.Element {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground'
            : 'max-w-[95%] rounded-2xl bg-muted px-4 py-2 text-sm text-foreground'
        }
      >
        {message.responseType !== 'calendar_applied' ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : null}
        {!isUser && message.responseType === 'calendar_preview' && message.proposedChanges ? (
          <HostCalendarChangePreview
            entries={message.proposedChanges.entries}
            dateFrom={message.proposedChanges.dateFrom}
            dateTo={message.proposedChanges.dateTo}
            basePricePerNight={basePricePerNight}
            isConfirming={isConfirming}
            status={message.confirmStatus}
            onConfirm={() => onConfirm(message.proposedChanges!.entries)}
            onCancel={onCancel}
          />
        ) : null}
        {!isUser && message.responseType === 'calendar_applied' ? (
          <HostCalendarAppliedCard message={message.content} revertHint={message.revertHint} />
        ) : null}
      </div>
    </div>
  );
}
