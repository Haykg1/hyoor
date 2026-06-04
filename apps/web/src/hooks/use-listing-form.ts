import {
  useListingFormStore,
  type ListingFormActions,
  type ListingFormState,
} from '@/store/listing-form.store';

export function useListingForm(): ListingFormState & ListingFormActions {
  return useListingFormStore();
}
