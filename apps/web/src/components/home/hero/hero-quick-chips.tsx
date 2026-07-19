'use client';

import Image from 'next/image';

import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { QUICK_DESTINATIONS } from '@/lib/constants/armenian-cities';

export function HeroQuickChips(): React.JSX.Element {
  const { goToSearch } = useSearchNavigation();
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {QUICK_DESTINATIONS.map((destination) => (
        <button
          key={destination.name}
          type="button"
          onClick={() => goToSearch({ location: destination.name })}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 py-1 pl-1 pr-3 text-xs text-white backdrop-blur transition-colors hover:bg-white/30"
        >
          <Image
            src={destination.image}
            alt={destination.alt}
            width={22}
            height={22}
            className="h-[22px] w-[22px] rounded-full object-cover"
          />
          {destination.name}
        </button>
      ))}
    </div>
  );
}
