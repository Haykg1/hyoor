'use client';

import type { PropertyPhotoView } from '@repo/shared';
import { Camera, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const PLACEHOLDER = 'https://placehold.co/800x600/e2e8f0/94a3b8?text=No+photo';

interface PropertyGalleryProps {
  photos: PropertyPhotoView[];
  title: string;
}

export function PropertyGallery({ photos, title }: PropertyGalleryProps): React.JSX.Element {
  const t = useTranslations('property_detail');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cover = photos[0]?.url ?? PLACEHOLDER;
  const side = photos.slice(1, 5);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2">
          <div
            className="relative col-span-1 h-64 cursor-pointer md:col-span-2 md:row-span-2 md:h-auto"
            style={{ minHeight: 320 }}
            onClick={() => setLightbox(cover)}
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
              onClick={() => setLightbox(photo.url)}
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
            onClick={() => setLightbox(cover)}
          >
            <Camera className="h-4 w-4" />
            {t('gallery.show_all', { count: photos.length })}
          </Button>
        )}
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black/90 p-2">
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {lightbox && (
            <div className="relative h-[80vh] w-full">
              <Image src={lightbox} alt={title} fill className="object-contain" sizes="100vw" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
