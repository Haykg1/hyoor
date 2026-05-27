import { Baby, Bath, BedDouble, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PropertyStatsProps {
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  bedrooms: number;
  bathrooms: number;
}

export function PropertyStats({
  maxGuests,
  maxAdults,
  maxChildren,
  maxInfants,
  bedrooms,
  bathrooms,
}: PropertyStatsProps): React.JSX.Element {
  const t = useTranslations('property_detail');
  const hasBreakdown = maxAdults > 0 || maxChildren > 0;

  return (
    <div className="flex flex-wrap gap-6 border-b border-border py-4">
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span>{t('guests_count', { count: maxGuests })}</span>
      </div>

      {hasBreakdown && (
        <div className="flex flex-wrap items-center gap-4">
          {maxAdults > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t('adults_count', { count: maxAdults })}</span>
            </div>
          )}
          {maxChildren > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{t('children_count', { count: maxChildren })}</span>
            </div>
          )}
          {maxInfants > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Baby className="h-4 w-4" />
              <span>{t('infants_count', { count: maxInfants })}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <BedDouble className="h-5 w-5 text-muted-foreground" />
        <span>{t('bedrooms_count', { count: bedrooms })}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Bath className="h-5 w-5 text-muted-foreground" />
        <span>{t('bathrooms_count', { count: bathrooms })}</span>
      </div>
    </div>
  );
}
