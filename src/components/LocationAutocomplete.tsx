import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, MapPin } from 'lucide-react';

export interface LocationSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  district: string;
}

interface NominatimAddress {
  state_district?: string;
  county?: string;
  city?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  placeholder: string;
  language?: string;
  className?: string;
}

function normalizeDistrict(address?: NominatimAddress): string {
  const district = address?.state_district || address?.county || address?.city || '';
  return district.replace(/\s+District$/i, '').trim();
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  language = 'en',
  className = '',
}: LocationAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedValueRef = useRef('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchFailed, setSearchFailed] = useState(false);

  useEffect(() => {
    if (value.trim().length < 3 || value === selectedValueRef.current) {
      setSuggestions([]);
      setIsOpen(false);
      setHasSearched(false);
      setSearchFailed(false);
      return;
    }

    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(false);
      setSearchFailed(false);
      try {
        const params = new URLSearchParams({
          format: 'json',
          addressdetails: '1',
          countrycodes: 'lk',
          limit: '5',
          q: value.trim(),
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            headers: { 'Accept-Language': language },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(`Address search failed with status ${response.status}`);
        const results: NominatimResult[] = await response.json();
        const mapped = results.flatMap(result => {
          const latitude = Number(result.lat);
          const longitude = Number(result.lon);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !result.display_name) {
            return [];
          }
          return [{
            displayName: result.display_name,
            latitude,
            longitude,
            district: normalizeDistrict(result.address),
          }];
        });
        setSuggestions(mapped);
        setIsOpen(true);
        setHasSearched(true);
        setActiveIndex(-1);
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('OpenStreetMap address search failed.', error);
          setSuggestions([]);
          setIsOpen(true);
          setHasSearched(true);
          setSearchFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [value, language]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    selectedValueRef.current = suggestion.displayName;
    onSelect(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    setHasSearched(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(index => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin size={16} className="absolute left-3 top-2.5 text-[#5A7290]" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="location-autocomplete-options"
          aria-activedescendant={activeIndex >= 0 ? `location-option-${activeIndex}` : undefined}
          className="w-full pl-9 pr-9 py-2 border border-[#CBD8E6] rounded-xl text-sm text-[#0D1B2E] focus:outline-none focus:border-[#1A3A6B] bg-white"
          onChange={event => {
            selectedValueRef.current = '';
            onChange(event.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0 || hasSearched) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-[#5A7290]" aria-label="Searching addresses" />
        )}
      </div>

      {isOpen && (suggestions.length > 0 || hasSearched) && (
        <div
          id="location-autocomplete-options"
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#CBD8E6] rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              id={`location-option-${index}`}
              key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.displayName}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`w-full px-3 py-2.5 text-left text-xs text-[#0D1B2E] border-b border-[#F0F4F8] last:border-0 flex items-start gap-2 ${
                activeIndex === index ? 'bg-[#F0F4F8]' : 'hover:bg-[#F0F4F8]'
              }`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <MapPin size={14} className="text-[#1A3A6B] shrink-0 mt-0.5" />
              <span>{suggestion.displayName}</span>
            </button>
          ))}
          {hasSearched && suggestions.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-[#5A7290]">
              {searchFailed ? 'Address search is unavailable. Please try again.' : 'No results found.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
