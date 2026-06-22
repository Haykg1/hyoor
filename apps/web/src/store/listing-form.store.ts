import type { AmenityInput, PropertyDetail } from '@repo/shared';
import { getLocalizedAddress } from '@repo/shared';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import {
  createProperty,
  deletePropertyPhoto,
  patchProperty,
  replacePropertyAmenities,
  updatePropertyPhoto,
  uploadPropertyPhotoFile,
} from '@/lib/api/properties';
import {
  DEFAULT_LISTING_VALUES,
  type ListingFormValues,
  normalizeStepDetailsValues,
  toCreatePropertyInput,
} from '@/lib/listing/schema';

export type ListingWizardMode = 'create' | 'edit';
export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface ListingPhotoEntry {
  localId: string;
  id?: string;
  key?: string;
  url: string;
  caption: string;
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
  hydrateFromProperty: (property: PropertyDetail, locale: string) => void;
  setStep: (step: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setData: (partial: Partial<ListingFormValues>) => void;
  addPendingPhotos: (files: File[]) => void;
  removePhoto: (localId: string) => void;
  setCoverPhoto: (localId: string) => void;
  updatePhotoCaption: (localId: string, caption: string) => void;
  movePhoto: (localId: string, direction: 'up' | 'down') => void;
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

function normalizeTimeForInput(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function reindexPhotos(photos: ListingPhotoEntry[]): ListingPhotoEntry[] {
  return photos.map((photo, index) => ({ ...photo, sortOrder: index }));
}

function parseCancellationPolicy(value: string): ListingFormValues['cancellationPolicy'] {
  if (
    value === 'FLEXIBLE' ||
    value === 'MODERATE' ||
    value === 'STRICT' ||
    value === 'NON_REFUNDABLE'
  ) {
    return value;
  }
  return 'MODERATE';
}

export const useListingFormStore = create<ListingFormState & ListingFormActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...INITIAL_STATE,
        initCreate: () => {
          set({ ...INITIAL_STATE, mode: 'create', hydrated: true });
        },
        hydrateFromProperty: (property, locale) => {
          const amenities: AmenityInput[] = property.amenities.map((a) => ({
            name: a.name,
            category: a.category ?? undefined,
          }));
          const sortedPhotos = [...property.photos].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          );
          const addressFallback = {
            city: property.city,
            region: property.region ?? null,
            street: property.street ?? null,
            formattedAddress: property.formattedAddress ?? property.addressLine ?? property.city,
          };
          const address = getLocalizedAddress(property.addressLabels, locale, addressFallback);
          set({
            mode: 'edit',
            propertyId: property.id,
            step: 1,
            hydrated: true,
            data: normalizeStepDetailsValues({
              propertyType: property.propertyType,
              title: property.title,
              titleEn: property.titleLabels?.en ?? '',
              titleRu: property.titleLabels?.ru ?? '',
              titleHy: property.titleLabels?.hy ?? '',
              description: property.description ?? '',
              city: address.city ?? property.city,
              region: address.region ?? property.region ?? '',
              street: address.street ?? property.street ?? '',
              buildingNumber: property.buildingNumber ?? '',
              formattedAddress: address.formattedAddress,
              placeKind: property.placeKind ?? '',
              apartmentNumber: property.apartmentNumber ?? '',
              addressLine: property.addressLine ?? '',
              country: property.country,
              latitude:
                property.latitude !== null && property.latitude !== undefined
                  ? Number(property.latitude)
                  : undefined,
              longitude:
                property.longitude !== null && property.longitude !== undefined
                  ? Number(property.longitude)
                  : undefined,
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
              securityDeposit: property.securityDeposit ?? 0,
              cancellationPolicy: parseCancellationPolicy(property.cancellationPolicy),
              minNights: property.minNights,
              maxNights: property.maxNights ?? undefined,
              checkInTime: normalizeTimeForInput(property.checkInTime, '15:00'),
              checkOutTime: normalizeTimeForInput(property.checkOutTime, '11:00'),
              smokingAllowed: property.smokingAllowed,
              petsAllowed: property.petsAllowed,
              partiesAllowed: property.partiesAllowed,
              quietHoursStart: normalizeTimeForInput(property.quietHoursStart, ''),
              quietHoursEnd: normalizeTimeForInput(property.quietHoursEnd, ''),
              additionalRules: property.additionalRules ?? '',
              guestInstructions: property.guestInstructions ?? '',
              featuredPoiIds: property.featuredPoiIds ?? [],
            }),
            photos: sortedPhotos.map((p, index) => ({
              localId: p.id,
              id: p.id,
              key: p.key,
              url: p.url,
              caption: p.caption ?? '',
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
            caption: '',
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
          const nextPhotos = reindexPhotos(photos.filter((p) => p.localId !== localId));
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
        updatePhotoCaption: (localId, caption) => {
          set((s) => ({
            photos: s.photos.map((p) => (p.localId === localId ? { ...p, caption } : p)),
          }));
        },
        movePhoto: (localId, direction) => {
          const { photos } = get();
          const index = photos.findIndex((p) => p.localId === localId);
          if (index < 0) return;
          const swapIndex = direction === 'up' ? index - 1 : index + 1;
          if (swapIndex < 0 || swapIndex >= photos.length) return;
          const next = [...photos];
          const current = next[index];
          const swap = next[swapIndex];
          if (!current || !swap) return;
          next[index] = swap;
          next[swapIndex] = current;
          set({ photos: reindexPhotos(next) });
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
                  sortOrder: photo.sortOrder,
                  caption: photo.caption.trim() || undefined,
                });
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
            const existingPhotos = get().photos.filter((p) => p.id && !p.file);
            for (const photo of existingPhotos) {
              if (!photo.id) continue;
              await updatePropertyPhoto(id, photo.id, {
                caption: photo.caption.trim() || undefined,
                sortOrder: photo.sortOrder,
                isCover: photo.isCover,
              });
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
