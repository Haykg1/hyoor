import type { PropertyAmenityView } from '@repo/shared';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PropertyAmenitiesProps {
  amenities: PropertyAmenityView[];
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps): React.JSX.Element | null {
  const t = useTranslations('property_detail.amenities');
  if (amenities.length === 0) return null;
  return (
    <section className="space-y-3 border-b border-border py-6">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {amenities.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 flex-shrink-0 text-primary" />
            {a.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
