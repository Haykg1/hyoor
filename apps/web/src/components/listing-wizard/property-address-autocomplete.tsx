'use client';

import type { PlaceResult } from '@repo/shared';
import { useTranslations } from 'next-intl';

import { PlaceAutocomplete } from '@/components/search/place-autocomplete';

interface PropertyAddressAutocompleteProps {
  value: string;
  onSelectPlace: (place: PlaceResult) => void;
}

export function PropertyAddressAutocomplete({
  value,
  onSelectPlace,
}: PropertyAddressAutocompleteProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.basics');
  return (
    <PlaceAutocomplete
      value={value}
      onChange={() => undefined}
      onSelectPlace={onSelectPlace}
      placeholder={t('address_search_placeholder')}
      level="house"
      translationNamespace="listing_wizard.basics"
    />
  );
}
