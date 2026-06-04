'use client';

import type { PropertyDetail } from '@repo/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PropertyCalendarView } from '@/components/dashboard/calendar/property-calendar-view';
import { useRouter } from '@/i18n/navigation';
import { getMyPropertyDetail } from '@/lib/api/properties';
import { useAuthStore } from '@/store';

interface CalendarPageProps {
  params: { id: string };
}

export default function PropertyCalendarPage({ params }: CalendarPageProps): React.JSX.Element {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'HOST' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/trips');
      return;
    }
    getMyPropertyDetail(params.id)
      .then(setProperty)
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false));
  }, [params.id, router, user, authLoading]);

  if (authLoading || loading || !property) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <PropertyCalendarView property={property} />;
}
