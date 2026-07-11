'use client';

import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { PayoutsPanel } from '@/components/dashboard/payouts-panel';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

function PayoutsPanelSection(): React.JSX.Element {
  const t = useTranslations('account.payouts');
  const searchParams = useSearchParams();
  const notified = useRef(false);
  const onboarded = searchParams.get('onboarded') === '1';

  useEffect(() => {
    if (notified.current) return;
    if (onboarded) {
      notified.current = true;
      toast.success(t('return_onboarded'));
    } else if (searchParams.get('refresh') === '1') {
      notified.current = true;
      toast.info(t('return_refresh'));
    }
  }, [searchParams, t, onboarded]);

  return <PayoutsPanel autoSync={onboarded} />;
}

export default function DashboardPayoutsPage(): React.JSX.Element {
  const t = useTranslations('account.payouts');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard/payouts');
      return;
    }
    if (user.role !== 'HOST' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/trips');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-lg px-4 py-16" />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_dashboard')}
      </Link>
      <Suspense fallback={<PayoutsPanel />}>
        <PayoutsPanelSection />
      </Suspense>
    </div>
  );
}
