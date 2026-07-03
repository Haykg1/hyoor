'use client';

import type { PropertyPhotoView } from '@repo/shared';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';

interface PropertyGalleryProps {
  photos: PropertyPhotoView[];
  title: string;
}

export function PropertyGallery({ photos, title }: PropertyGalleryProps): React.JSX.Element {
  const t = useTranslations('property_detail');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const cover = photos[0]?.url ?? PROPERTY_PLACEHOLDER_IMAGE;
  const side = photos.slice(1, 5);
  const isOpen = lightboxIndex !== null;
  const activePhoto =
    lightboxIndex !== null ? (photos[lightboxIndex]?.url ?? PROPERTY_PLACEHOLDER_IMAGE) : null;
  const goToPrevious = useCallback(() => {
    if (photos.length === 0) return;
    setLightboxIndex((current) => {
      if (current === null) return 0;
      return current === 0 ? photos.length - 1 : current - 1;
    });
  }, [photos.length]);
  const goToNext = useCallback(() => {
    if (photos.length === 0) return;
    setLightboxIndex((current) => {
      if (current === null) return 0;
      return current === photos.length - 1 ? 0 : current + 1;
    });
  }, [photos.length]);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, goToPrevious, goToNext]);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2">
          <div
            className="relative col-span-1 h-64 cursor-pointer md:col-span-2 md:row-span-2 md:h-auto"
            style={{ minHeight: 320 }}
            onClick={() => setLightboxIndex(0)}
          >
            <Image
              src={cover}
              alt={title}
              fill
              className="object-cover transition-opacity hover:opacity-95"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          {side.map((photo, i) => (
            <div
              key={photo.id ?? i}
              className="relative hidden h-36 cursor-pointer md:block md:h-auto"
              onClick={() => setLightboxIndex(i + 1)}
            >
              <Image
                src={photo.url}
                alt={`${title} photo ${i + 2}`}
                fill
                className="object-cover transition-opacity hover:opacity-95"
                sizes="25vw"
              />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3 gap-1.5 shadow"
            onClick={() => setLightboxIndex(0)}
          >
            <Camera className="h-4 w-4" />
            {t('gallery.show_all', { count: photos.length })}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black/90 p-2">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1 text-white"
            aria-label={t('gallery.close')}
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxIndex !== null && photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                aria-label={t('gallery.previous')}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                aria-label={t('gallery.next')}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {t('gallery.counter', { current: lightboxIndex + 1, total: photos.length })}
              </p>
            </>
          )}
          {activePhoto && (
            <div className="relative h-[80vh] w-full">
              <Image
                src={activePhoto}
                alt={`${title} photo ${lightboxIndex !== null ? lightboxIndex + 1 : 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
