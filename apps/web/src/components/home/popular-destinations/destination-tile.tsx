'use client';

import { useSearchNavigation } from '@/hooks/use-search-navigation';
import type { DestinationTile as DestinationTileData } from '@/types/destination';

interface DestinationTileProps {
  destination: DestinationTileData;
}

export function DestinationTile({ destination }: DestinationTileProps): React.JSX.Element {
  const { goToSearch } = useSearchNavigation();
  return (
    <button
      type="button"
      onClick={() => goToSearch({ location: destination.name })}
      className="group relative aspect-square overflow-hidden rounded-2xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={destination.imageUrl}
        alt={destination.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
      <span className="absolute bottom-3 left-0 right-0 text-center text-sm font-semibold text-white">
        {destination.name}
      </span>
    </button>
  );
}
