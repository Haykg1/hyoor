'use client';

import type { PropertyPhotoView } from '@repo/shared';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/constants/property-placeholder';
import { propertyImageTransitionStyle } from '@/lib/constants/view-transitions';
import { cn } from '@/lib/utils';

interface PropertyGalleryProps {
  propertyId: string;
  photos: PropertyPhotoView[];
  title: string;
}

interface OutgoingPhoto {
  index: number;
  url: string;
  direction: 'next' | 'prev';
}

async function preloadImage(url: string): Promise<void> {
  const image = new window.Image();
  image.src = url;
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, 350);
  });
  await Promise.race([
    image.decode().then(
      () => undefined,
      () => undefined,
    ),
    timeout,
  ]);
}

export function PropertyGallery({
  propertyId,
  photos,
  title,
}: PropertyGalleryProps): React.JSX.Element {
  const t = useTranslations('property_detail');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [outgoing, setOutgoing] = useState<OutgoingPhoto | null>(null);
  const cover = photos[0]?.url ?? PROPERTY_PLACEHOLDER_IMAGE;
  const side = photos.slice(1, 5);
  const isOpen = lightboxIndex !== null;
  const activePhoto =
    lightboxIndex !== null ? (photos[lightboxIndex]?.url ?? PROPERTY_PLACEHOLDER_IMAGE) : null;
  const openLightbox = (index: number): void => {
    const url = photos[index]?.url ?? PROPERTY_PLACEHOLDER_IMAGE;
    void preloadImage(url).then(() => {
      setOutgoing(null);
      setLightboxIndex(index);
    });
  };
  const closeLightbox = (): void => {
    setOutgoing(null);
    setLightboxIndex(null);
  };
  const changePhoto = useCallback(
    (direction: 'next' | 'prev') => {
      if (photos.length < 2 || lightboxIndex === null) return;
      const nextIndex =
        direction === 'next'
          ? (lightboxIndex + 1) % photos.length
          : (lightboxIndex - 1 + photos.length) % photos.length;
      setOutgoing({
        index: lightboxIndex,
        url: photos[lightboxIndex]?.url ?? PROPERTY_PLACEHOLDER_IMAGE,
        direction,
      });
      setLightboxIndex(nextIndex);
    },
    [photos, lightboxIndex],
  );
  const goToPrevious = useCallback(() => changePhoto('prev'), [changePhoto]);
  const goToNext = useCallback(() => changePhoto('next'), [changePhoto]);
  useEffect(() => {
    if (lightboxIndex === null || photos.length < 2) return;
    const neighbors = [
      photos[(lightboxIndex + 1) % photos.length]?.url,
      photos[(lightboxIndex - 1 + photos.length) % photos.length]?.url,
    ];
    for (const url of neighbors) {
      if (url) void preloadImage(url);
    }
  }, [lightboxIndex, photos]);
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
            style={{ minHeight: 320, ...propertyImageTransitionStyle(propertyId) }}
            onClick={() => openLightbox(0)}
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
              onClick={() => openLightbox(i + 1)}
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
            onClick={() => openLightbox(0)}
          >
            <Camera className="h-4 w-4" />
            {t('gallery.show_all', { count: photos.length })}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl overflow-hidden border-0 bg-black/90 p-2 duration-0 data-[state=closed]:animate-none data-[state=open]:animate-none">
          <button
            type="button"
            onClick={closeLightbox}
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
            <div className="relative h-[80vh] w-full overflow-hidden">
              {outgoing && (
                <div
                  key={`outgoing-${outgoing.index}`}
                  onAnimationEnd={() => setOutgoing(null)}
                  className={cn(
                    'absolute inset-0 animate-out fade-out fill-mode-forwards duration-500 ease-in-out',
                    outgoing.direction === 'next'
                      ? 'slide-out-to-left-full'
                      : 'slide-out-to-right-full',
                  )}
                >
                  <Image
                    src={outgoing.url}
                    alt={`${title} photo ${outgoing.index + 1}`}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    unoptimized
                  />
                </div>
              )}
              <div
                key={lightboxIndex}
                className={cn(
                  'absolute inset-0',
                  outgoing && [
                    'animate-in fade-in duration-500 ease-in-out',
                    outgoing.direction === 'next'
                      ? 'slide-in-from-right-full'
                      : 'slide-in-from-left-full',
                  ],
                )}
              >
                <Image
                  src={activePhoto}
                  alt={`${title} photo ${lightboxIndex !== null ? lightboxIndex + 1 : 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
