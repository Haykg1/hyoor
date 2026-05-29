'use client';

import { ChevronDown, ChevronUp, ImagePlus, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ListingPhotoEntry } from '@/store/listing-form.store';

interface PhotoDropzoneProps {
  photos: ListingPhotoEntry[];
  onAdd: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onSetCover: (localId: string) => void;
  onUpdateCaption: (localId: string, caption: string) => void;
  onMovePhoto: (localId: string, direction: 'up' | 'down') => void;
}

export function PhotoDropzone({
  photos,
  onAdd,
  onRemove,
  onSetCover,
  onUpdateCaption,
  onMovePhoto,
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
        <div className="space-y-3">
          {photos.map((photo, index) => (
            <div key={photo.localId} className="flex gap-3 rounded-lg border border-border p-2">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
                <Image src={photo.url} alt="" fill className="object-cover" unoptimized />
                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                    {t('uploading')}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  placeholder={t('caption_placeholder')}
                  value={photo.caption}
                  onChange={(e) => onUpdateCaption(photo.localId, e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => onMovePhoto(photo.localId, 'up')}
                    aria-label={t('move_up')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={index === photos.length - 1}
                    onClick={() => onMovePhoto(photo.localId, 'down')}
                    aria-label={t('move_down')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onSetCover(photo.localId)}
                    aria-label={t('set_cover')}
                  >
                    <Star
                      className={cn('h-3 w-3', photo.isCover && 'fill-amber-400 text-amber-400')}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemove(photo.localId)}
                    aria-label={t('remove_photo')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
