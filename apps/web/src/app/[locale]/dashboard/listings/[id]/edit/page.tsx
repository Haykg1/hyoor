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
    getMyPropertyDetail(params.id)
      .then(setProperty)
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false));
  }, [params.id, router]);
  if (loading || !property) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  }
  return <ListingWizard mode="edit" initialProperty={property} />;
}
