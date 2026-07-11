'use client';

import type { PublicHostProfile } from '@repo/shared';
import { SPOKEN_LANGUAGES } from '@repo/shared';
import { Languages, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { findOrCreateConversation } from '@/lib/api/messaging';
import { useAuthStore } from '@/store/auth.store';

interface PropertyHostCardProps {
  host: PublicHostProfile;
  propertyId: string;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function PropertyHostCard({ host, propertyId }: PropertyHostCardProps): React.JSX.Element {
  const t = useTranslations('property_detail.host');
  const tMessaging = useTranslations('messaging');
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [starting, setStarting] = useState(false);
  const canChat = user?.role === 'GUEST';
  async function handleChat(): Promise<void> {
    if (!user) {
      router.push(`/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!canChat) return;
    setStarting(true);
    try {
      const conversation = await findOrCreateConversation(propertyId);
      router.push(`/messages?c=${conversation.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : tMessaging('start_chat_error');
      toast.error(message);
    } finally {
      setStarting(false);
    }
  }
  return (
    <section className="space-y-3 border-b border-border py-6">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {(host.avatarUrl ?? host.logoUrl) && (
            <AvatarImage src={host.avatarUrl ?? host.logoUrl ?? ''} alt={host.displayName} />
          )}
          <AvatarFallback className="text-lg">{initials(host.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-medium">{host.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {host.hostType === 'COMPANY' ? t('company') : t('individual')}
          </p>
          {host.isVerified && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('verified')}
            </span>
          )}
        </div>
      </div>
      {host.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{host.description}</p>
      ) : null}
      {host.spokenLanguages && host.spokenLanguages.length > 0 && (
        <div className="flex items-start gap-2 pt-1">
          <Languages className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('speaks')}</p>
            <div className="flex flex-wrap gap-1.5">
              {host.spokenLanguages.map((code) => {
                const lang = SPOKEN_LANGUAGES.find((l) => l.code === code);
                return (
                  <span
                    key={code}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium"
                  >
                    {lang?.label ?? code}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {canChat || !user ? (
        <Button
          type="button"
          variant="outline"
          className="mt-2 gap-2"
          disabled={starting}
          onClick={() => void handleChat()}
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {t('chat_with_host')}
        </Button>
      ) : null}
    </section>
  );
}
