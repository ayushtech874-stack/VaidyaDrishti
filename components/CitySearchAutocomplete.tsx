'use client';

import React, { useState, useEffect, useRef } from 'react';
import indianCitiesData from '@/lib/data/indian-cities.json';

interface CityItem {
  city: string;
  state: string;
}

interface CitySearchAutocompleteProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export default function CitySearchAutocomplete({
  selectedCity,
  onSelectCity,
}: CitySearchAutocompleteProps) {
  const [query, setQuery] = useState(selectedCity || '');
  const [isOpen, setIsOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cities: CityItem[] = indianCitiesData as CityItem[];

  useEffect(() => {
    setQuery(selectedCity || '');
  }, [selectedCity]);

  // Filter cities by search query
  const filteredCities = query.trim() === ''
    ? cities.slice(0, 10)
    : cities
        .filter(
          (c) =>
            c.city.toLowerCase().includes(query.toLowerCase()) ||
            c.state.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cityName: string) => {
    setQuery(cityName);
    onSelectCity(cityName);
    setIsOpen(false);
  };

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // OpenStreetMap Nominatim reverse geocoding
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'VaidyaDrishti/1.0 (contact@vaidyadrishti.com)',
              },
            }
          );
          const data = await res.json();
          const addr = data.address || {};
          const detectedName =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.district ||
            addr.county ||
            addr.state_district ||
            'Bhagalpur';

          // Match against canonical cities in indian-cities.json
          const matched = cities.find(
            (c) =>
              c.city.toLowerCase() === detectedName.toLowerCase() ||
              detectedName.toLowerCase().includes(c.city.toLowerCase()) ||
              c.city.toLowerCase().includes(detectedName.toLowerCase())
          );

          const finalCity = matched ? matched.city : detectedName;
          handleSelect(finalCity);
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
          handleSelect('Bhagalpur');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        console.warn(err);
        alert('Could not auto-detect location. Please search and select your city manually.');
      }
    );
  };

  return (
    <div ref={containerRef} className="space-y-3 w-full">
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        {/* Auto-Detect Button */}
        <button
          type="button"
          onClick={handleAutoDetectLocation}
          disabled={locating}
          className="w-full sm:w-auto btn-primary py-3 px-5 text-xs font-bold shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>{locating ? '⌛ Locating...' : '📍 Auto-Detect Location'}</span>
        </button>

        {/* Searchable Autocomplete Combobox */}
        <div className="relative w-full">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search 1,200+ Indian Cities (e.g. Patna, Bhagalpur, Mumbai)..."
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] text-[var(--color-ink)] text-xs font-bold rounded-[var(--radius-md)] pl-9 pr-8 py-3 focus:outline-none focus:border-[var(--color-violet)] placeholder:text-[var(--color-ink-muted)]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              🔍
            </span>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onSelectCity('');
                  setIsOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Panel */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-xl z-50 max-h-60 overflow-y-auto font-sans divide-y divide-[var(--color-border)]/40">
              {filteredCities.length > 0 ? (
                filteredCities.map((item) => (
                  <button
                    key={`${item.city}-${item.state}`}
                    type="button"
                    onClick={() => handleSelect(item.city)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-teal-soft)] transition flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <span>📍</span> {item.city}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase">
                      {item.state}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-[var(--color-ink-muted)]">
                  No matching cities found for &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
