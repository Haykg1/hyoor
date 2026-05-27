'use client';

import type { PropertyDetail, PropertyType } from '@repo/shared';
import { ArrowLeft, MapPin, Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { categoryFromPropertyType } from '@/lib/api/properties';

interface PropertyDetailHeaderProps {
  property: Pick<
    PropertyDetail,
    | 'title'
    | 'propertyType'
    | 'city'
    | 'region'
    | 'country'
    | 'addressLine'
    | 'avgRating'
    | 'reviewCount'
  >;
}

const CATEGORY_LABELS: Record<string, string> = {
  apartment: 'Apartment',
  house: 'House',
  villa: 'Villa',
  guesthouse: 'Guesthouse',
  studio: 'Studio',
  hotel_room: 'Hotel Room',
};

function propertyTypeLabel(type: PropertyType): string {
  const cat = categoryFromPropertyType(type);
  return cat ? (CATEGORY_LABELS[cat] ?? type) : type;
}

export function PropertyDetailHeader({ property }: PropertyDetailHeaderProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link href="/search" className="mr-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Badge variant="secondary" className="text-xs">
          {propertyTypeLabel(property.propertyType)}
        </Badge>
      </div>
      <h1 className="text-2xl font-bold leading-tight md:text-3xl">{property.title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {(property.avgRating ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-foreground">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{property.avgRating!.toFixed(1)}</span>
            <span className="text-muted-foreground">({property.reviewCount})</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[property.addressLine, property.city, property.region, property.country]
            .filter(Boolean)
            .join(', ')}
        </span>
      </div>
    </div>
  );
}
