import type { AmenityInput, PropertyDetail } from '@repo/shared';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import {
  createProperty,
  deletePropertyPhoto,
  patchProperty,
  replacePropertyAmenities,
  uploadPropertyPhotoFile,
} from '@/lib/api/properties';
import {
  DEFAULT_LISTING_VALUES,
  type ListingFormValues,
  toCreatePropertyInput,
} from '@/lib/listing/schema';

export type ListingWizardMode = 'create' | 'edit';
export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface ListingPhotoEntry {
  localId: string;
  id?: string;
  key?: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
  file?: File;
  status: PhotoUploadStatus;
  error?: string;
  markedForDeletion?: boolean;
}

export interface ListingFormState {
  mode: ListingWizardMode;
  propertyId: string | null;
  step: number;
  data: ListingFormValues;
  photos: ListingPhotoEntry[];
  removedPhotoIds: string[];
  isSubmitting: boolean;
  error: string | null;
  hydrated: boolean;
}

export interface ListingFormActions {
  initCreate: () => void;
  hydrateFromProperty: (property: PropertyDetail) => void;
  setStep: (step: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setData: (partial: Partial<ListingFormValues>) => void;
  addPendingPhotos: (files: File[]) => void;
  removePhoto: (localId: string) => void;
  setCoverPhoto: (localId: string) => void;
  submit: () => Promise<string>;
  reset: () => void;
}

const INITIAL_STATE: ListingFormState = {
  mode: 'create',
  propertyId: null,
  step: 1,
  data: DEFAULT_LISTING_VALUES,
  photos: [],
  removedPhotoIds: [],
  isSubmitting: false,
  error: null,
  hydrated: false,
};

function newLocalId(): string {
  return `local-${crypto.randomUUID()}`;
}

export const useListingFormStore = create<ListingFormState & ListingFormActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...INITIAL_STATE,
        initCreate: () => {
          set({ ...INITIAL_STATE, mode: 'create', hydrated: true });
        },
        hydrateFromProperty: (property) => {
          const amenities: AmenityInput[] = property.amenities.map((a) => ({
            name: a.name,
            category: a.category ?? undefined,
          }));
          set({
            mode: 'edit',
            propertyId: property.id,
            step: 1,
            hydrated: true,
            data: {
              propertyType: property.propertyType,
              title: property.title,
              description: property.description ?? '',
              city: property.city,
              region: property.region ?? '',
              addressLine: property.addressLine ?? '',
              country: property.country,
              bedrooms: property.bedrooms,
              beds: property.beds,
              bathrooms: property.bathrooms,
              maxGuests: property.maxGuests,
              maxAdults: property.maxAdults,
              maxChildren: property.maxChildren,
              maxInfants: property.maxInfants,
              amenities,
              pricePerNight: property.pricePerNight,
              cleaningFee: property.cleaningFee ?? 0,
              cancellationPolicy:
                property.cancellationPolicy === 'FLEXIBLE' ||
                property.cancellationPolicy === 'MODERATE' ||
                property.cancellationPolicy === 'STRICT' ||
                property.cancellationPolicy === 'NON_REFUNDABLE'
                  ? (property.cancellationPolicy as ListingFormValues['cancellationPolicy'])
                  : 'MODERATE',
              minNights: property.minNights,
              maxNights: property.maxNights ?? undefined,
            },
            photos: property.photos.map((p, index) => ({
              localId: p.id,
              id: p.id,
              key: p.key,
              url: p.url,
              isCover: p.isCover ?? index === 0,
              sortOrder: p.sortOrder ?? index,
              status: 'uploaded' as const,
            })),
            removedPhotoIds: [],
            error: null,
          });
        },
        setStep: (step) => set({ step }),
        goNext: () => set((s) => ({ step: Math.min(4, s.step + 1) })),
        goPrev: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
        setData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
        addPendingPhotos: (files) => {
          const { photos } = get();
          const startOrder = photos.length;
          const newEntries: ListingPhotoEntry[] = files.map((file, i) => ({
            localId: newLocalId(),
            url: URL.createObjectURL(file),
            isCover: photos.length === 0 && i === 0,
            sortOrder: startOrder + i,
            file,
            status: 'pending',
          }));
          set({ photos: [...photos, ...newEntries] });
        },
        removePhoto: (localId) => {
          const { photos, removedPhotoIds } = get();
          const target = photos.find((p) => p.localId === localId);
          if (!target) return;
          const nextPhotos = photos.filter((p) => p.localId !== localId);
          if (target.isCover && nextPhotos.length > 0) {
            const first = nextPhotos[0];
            if (first) {
              nextPhotos[0] = { ...first, isCover: true };
            }
          }
          const nextRemoved =
            target.id && !target.file ? [...removedPhotoIds, target.id] : removedPhotoIds;
          set({ photos: nextPhotos, removedPhotoIds: nextRemoved });
        },
        setCoverPhoto: (localId) => {
          set((s) => ({
            photos: s.photos.map((p) => ({ ...p, isCover: p.localId === localId })),
          }));
        },
        submit: async () => {
          const { mode, propertyId, data, photos, removedPhotoIds } = get();
          set({ isSubmitting: true, error: null });
          try {
            const payload = toCreatePropertyInput(data);
            let id = propertyId;
            if (mode === 'create') {
              const created = await createProperty(payload);
              id = created.id;
            } else if (id) {
              await patchProperty(id, payload);
            } else {
              throw new Error('Missing property id');
            }
            if (!id) throw new Error('Missing property id');
            for (const photoId of removedPhotoIds) {
              await deletePropertyPhoto(id, photoId);
            }
            const pending = photos.filter((p) => p.file && p.status !== 'uploaded');
            let sortOrder = photos.filter((p) => !p.file).length;
            for (const photo of pending) {
              if (!photo.file) continue;
              set((s) => ({
                photos: s.photos.map((p) =>
                  p.localId === photo.localId ? { ...p, status: 'uploading' } : p,
                ),
              }));
              try {
                const confirmed = await uploadPropertyPhotoFile(id, photo.file, {
                  isCover: photo.isCover,
                  sortOrder,
                });
                sortOrder += 1;
                set((s) => ({
                  photos: s.photos.map((p) =>
                    p.localId === photo.localId
                      ? {
                          ...p,
                          id: confirmed.id,
                          key: confirmed.key,
                          url: confirmed.url,
                          status: 'uploaded',
                          file: undefined,
                        }
                      : p,
                  ),
                }));
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload failed';
                set((s) => ({
                  photos: s.photos.map((p) =>
                    p.localId === photo.localId ? { ...p, status: 'error', error: message } : p,
                  ),
                }));
                throw err;
              }
            }
            await replacePropertyAmenities(id, data.amenities);
            set({ propertyId: id, isSubmitting: false });
            return id;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Submit failed';
            set({ isSubmitting: false, error: message });
            throw err;
          }
        },
        reset: () => set({ ...INITIAL_STATE }),
      }),
      {
        name: 'listing-form',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          mode: state.mode,
          propertyId: state.propertyId,
          step: state.step,
          data: state.data,
          photos: state.photos.map(({ file: _file, ...rest }) => rest),
          removedPhotoIds: state.removedPhotoIds,
          hydrated: state.hydrated,
        }),
      },
    ),
    { name: 'listing-form' },
  ),
);
