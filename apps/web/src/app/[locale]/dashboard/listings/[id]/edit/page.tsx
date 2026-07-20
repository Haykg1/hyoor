'use client';

import type { PropertyDetail } from '@repo/shared';
import { useEffect, useState } from 'react';

import { ListingWizard } from '@/components/listing-wizard/listing-wizard';
import { useRouter } from '@/i18n/navigation';
import { getMyPropertyDetail } from '@/lib/api/properties';

interface EditListingPageProps {
  params: { id: string };
}

export default function EditListingPage({ params }: EditListingPageProps): React.JSX.Element {
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyPropertyDetail(params.id)
      .then((detail) => {
        if (!cancelled) setProperty(detail);
      })
      .catch(() => {
        if (!cancelled) void router.replace('/dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);
  if (loading || !property) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  }
  return <ListingWizard mode="edit" initialProperty={property} />;
}
