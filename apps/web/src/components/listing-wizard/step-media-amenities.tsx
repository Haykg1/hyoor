'use client';

import type { UseFormReturn } from 'react-hook-form';

import { AmenityMultiSelect } from '@/components/listing-wizard/amenity-multi-select';
import { PhotoDropzone } from '@/components/listing-wizard/photo-dropzone';
import { Form } from '@/components/ui/form';
import type { ListingFormValues } from '@/lib/listing/schema';
import type { ListingPhotoEntry } from '@/store/listing-form.store';

interface StepMediaAmenitiesProps {
  form: UseFormReturn<ListingFormValues>;
  photos: ListingPhotoEntry[];
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (localId: string) => void;
  onSetCoverPhoto: (localId: string) => void;
}

export function StepMediaAmenities({
  form,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onSetCoverPhoto,
}: StepMediaAmenitiesProps): React.JSX.Element {
  const amenities = form.watch('amenities');
  return (
    <Form {...form}>
      <div className="space-y-8">
        <PhotoDropzone
          photos={photos}
          onAdd={onAddPhotos}
          onRemove={onRemovePhoto}
          onSetCover={onSetCoverPhoto}
        />
        <AmenityMultiSelect
          selected={amenities}
          onChange={(next) => form.setValue('amenities', next, { shouldValidate: true })}
        />
      </div>
    </Form>
  );
}
