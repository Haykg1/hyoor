'use client';

import type { GeocodingSearchLevel, PlaceResult } from '@repo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { searchPlaces } from '@/lib/api/geocoding';
import { cn } from '@/lib/utils';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: PlaceResult) => void;
  placeholder?: string;
  level?: GeocodingSearchLevel;
  translationNamespace?: 'search.filters' | 'listing_wizard.basics';
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelectPlace,
  placeholder,
  level = 'any',
  translationNamespace = 'search.filters',
}: PlaceAutocompleteProps): React.JSX.Element {
  const t = useTranslations(translationNamespace);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(inputValue, 1000);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    searchPlaces(query, level)
      .then((places) => {
        if (!cancelled) {
          setSuggestions(places);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setIsOpen(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, level]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(place: PlaceResult): void {
    const display = place.description || place.fullName;
    setInputValue(display);
    onChange(display);
    onSelectPlace?.(place);
    setIsOpen(false);
  }

  const showDropdown = isOpen && debouncedQuery.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          if (e.target.value.trim().length >= 2) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          if (inputValue.trim().length >= 2) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        autoComplete="off"
      />
      {showDropdown ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover shadow-lg"
        >
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t('place_searching')}</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t('place_no_results')}</p>
          ) : (
            suggestions.map((place) => (
              <button
                key={`${place.fullName}-${place.lat}-${place.lng}`}
                type="button"
                role="option"
                aria-selected={place.description === value || place.fullName === value}
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(place)}
              >
                <span className="font-medium">{place.name}</span>
                <span className="text-xs text-muted-foreground">{place.description}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
