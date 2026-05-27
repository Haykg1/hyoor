'use client';

import { ImagePlus, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListingPhotoEntry } from '@/store/listing-form.store';

interface PhotoDropzoneProps {
  photos: ListingPhotoEntry[];
  onAdd: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onSetCover: (localId: string) => void;
}

export function PhotoDropzone({
  photos,
  onAdd,
  onRemove,
  onSetCover,
}: PhotoDropzoneProps): React.JSX.Element {
  const t = useTranslations('listing_wizard.media');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) onAdd(files);
    },
    [onAdd],
  );
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }
  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border',
          'bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50',
        )}
      >
        <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">{t('dropzone_title')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('dropzone_hint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.localId}
              className="relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              <Image src={photo.url} alt="" fill className="object-cover" unoptimized />
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/50 p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetCover(photo.localId);
                  }}
                >
                  <Star
                    className={cn('h-3 w-3', photo.isCover && 'fill-amber-400 text-amber-400')}
                  />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(photo.localId);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {photo.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                  {t('uploading')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
