'use client';

import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { QUICK_DESTINATIONS } from '@/lib/constants/armenian-cities';

export function HeroQuickChips(): React.JSX.Element {
  const { goToSearch } = useSearchNavigation();
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {QUICK_DESTINATIONS.map((destination) => (
        <button
          key={destination}
          type="button"
          onClick={() => goToSearch({ location: destination })}
          className="rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur transition-colors hover:bg-white/30"
        >
          {destination}
        </button>
      ))}
    </div>
  );
}
