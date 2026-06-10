import type { PropertyDetail, ReviewView } from '@repo/shared';
import { getLocalizedTitle } from '@repo/shared';
import dynamic from 'next/dynamic';
import { getLocale } from 'next-intl/server';

import { BookingWidget } from './booking-widget/booking-widget';
import { PropertyAmenities } from './property-amenities';
import { PropertyDescription } from './property-description';
import { PropertyDetailHeader } from './property-detail-header';
import { PropertyGallery } from './property-gallery';
import { PropertyHostCard } from './property-host-card';
import { PropertyNearbyPlaces } from './property-nearby-places';
import { PropertyReviewsList } from './property-reviews-list';
import { PropertyStats } from './property-stats';

const PropertyMap = dynamic(() => import('./property-map').then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-muted" />,
});

interface PropertyDetailViewProps {
  property: PropertyDetail;
  initialReviews: ReviewView[];
}

export async function PropertyDetailView({
  property,
  initialReviews,
}: PropertyDetailViewProps): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const localizedTitle = getLocalizedTitle(property.titleLabels, locale, property.title);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-4">
        <PropertyDetailHeader property={property} />
        <PropertyGallery photos={property.photos} title={localizedTitle} />
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-0">
          <PropertyStats
            maxGuests={property.maxGuests}
            maxAdults={property.maxAdults}
            maxChildren={property.maxChildren}
            maxInfants={property.maxInfants}
            bedrooms={property.bedrooms}
            bathrooms={property.bathrooms}
          />
          <PropertyDescription description={property.description} />
          <PropertyAmenities amenities={property.amenities} />
          <PropertyNearbyPlaces property={property} />
          <PropertyHostCard host={property.host} />
          {property.latitude !== null && property.longitude !== null && (
            <PropertyMap
              latitude={property.latitude}
              longitude={property.longitude}
              title={localizedTitle}
            />
          )}
          <PropertyReviewsList
            propertyId={property.id}
            initialReviews={initialReviews}
            avgRating={property.avgRating}
            reviewCount={property.reviewCount}
          />
        </div>

        <div className="lg:sticky lg:top-20">
          <BookingWidget property={property} />
        </div>
      </div>
    </div>
  );
}
