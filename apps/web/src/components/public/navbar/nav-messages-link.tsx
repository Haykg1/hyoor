'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useMessagingStore } from '@/store/messaging.store';

interface NavMessagesLinkProps {
  className?: string;
  onNavigate?: () => void;
}

export function NavMessagesLink({
  className,
  onNavigate,
}: NavMessagesLinkProps): React.JSX.Element | null {
  const t = useTranslations('nav');
  const user = useAuthStore((s) => s.user);
  const totalUnread = useMessagingStore((s) => s.totalUnread);
  if (!user) return null;
  return (
    <Button variant="ghost" size="icon" className={cn('relative', className)} asChild>
      <Link href="/messages" aria-label={t('messages')} onClick={onNavigate}>
        <MessageSquare className="h-5 w-5" />
        {totalUnread > 0 ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
