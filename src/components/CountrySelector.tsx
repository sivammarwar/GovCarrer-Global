import { useState, useEffect } from "react";
import { Globe, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DbCountry, useCountries } from "@/hooks/useData";

interface CountrySelectorProps {
  onSelectCountry: (country: DbCountry) => void;
}

export const CountrySelector = ({ onSelectCountry }: CountrySelectorProps) => {
  const { countries, loading } = useCountries();
  const [searchQuery, setSearchQuery] = useState("");
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  const filteredCountries = countries.filter((country) =>
    country.country_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const detectCountry = async () => {
      if (countries.length === 0) return;
      setAutoDetecting(true);
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.country_name) {
          setDetectedCountry(data.country_name);
          const matched = countries.find(
            (c) => c.country_name.toLowerCase() === data.country_name.toLowerCase()
          );
          if (matched) {
            setTimeout(() => onSelectCountry(matched), 1500);
          }
        }
      } catch {
        // silently ignore geo-detection failures
      } finally {
        setAutoDetecting(false);
      }
    };
    detectCountry();
  }, [countries, onSelectCountry]);

  /*
    COUNTRY GRID MIN-HEIGHT
    This value (540px) is derived from:
      - search box:    64px
      - gap:           32px (mb-8)
      - 3 grid rows:   3 × (card ~112px + gap 16px) = 384px
      - footer note:   40px
    = 520px, rounded up to 540px for safety.

    Previously this was 480px, but with the search box on top that wasn't
    enough to cover the actual content height, so the page still shifted
    slightly (0.012 CLS). Using a value that's at least as tall as the
    rendered content eliminates the shift.

    For mobile (≤640px) the cards are smaller (grid-cols-2) so 420px is enough.
    We apply 540px desktop-first; the component is not visible on mobile
    in the same layout so this doesn't add unnecessary whitespace.
  */
  const GRID_MIN_HEIGHT = typeof window !== "undefined" && window.innerWidth < 640 ? 420 : 540;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden transition-colors duration-300">
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-6">

          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in max-w-5xl mx-auto">
            <div className="relative mb-8 rounded-3xl overflow-hidden shadow-2xl group">
              <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                <div className="relative z-10 text-white px-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-3xl mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Globe className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
                  </div>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg tracking-tight">
                    Global Government Jobs Portal
                  </h1>
                  <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto font-medium">
                    Your gateway to government opportunities worldwide
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {countries.length}+ Countries
                </span>
              </div>
            </div>

            {autoDetecting && (
              <div className="mt-4 inline-flex items-center gap-3 bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg animate-pulse">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-semibold">Detecting your location...</span>
              </div>
            )}
            {detectedCountry && !autoDetecting && (
              <div className="mt-4 inline-flex items-center gap-3 bg-green-500 dark:bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg animate-bounce">
                <span className="text-xl">✓</span>
                <span className="font-semibold">Detected: {detectedCountry} - Redirecting...</span>
              </div>
            )}
          </div>

          {/*
            COUNTRY GRID WRAPPER
            min-height set to GRID_MIN_HEIGHT (540px desktop / 420px mobile).
            This is the element PageSpeed flagged with CLS 0.012:
              <div class="w-full max-w-6xl mx-auto" style="min-height: 480px;">
            The previous 480px wasn't tall enough to cover the search box +
            the first 3 rows of country cards, so the page still shifted.
          */}
          <div className="w-full max-w-6xl mx-auto" style={{ minHeight: GRID_MIN_HEIGHT }}>

            <div className="relative mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search for a country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 pr-6 h-16 text-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-600 rounded-2xl shadow-xl transition-all focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-600/20"
              />
            </div>

            {loading ? (
              /*
                LOADING SKELETON — matches the grid layout so there's no
                height change when real cards load in. 5 columns × 3 rows
                at ~112px each = same visual footprint as the real grid.
              */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: "112px",
                      background: "#e2e8f0",
                      borderRadius: "16px",
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            ) : filteredCountries.length === 0 ? (
              <div className="text-center py-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-12 rounded-3xl border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                <Globe className="w-20 h-20 text-gray-400 dark:text-gray-600 mx-auto mb-6" />
                <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
                  No countries found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.id}
                      onClick={() => onSelectCountry(country)}
                      className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 p-6 sm:p-8 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-600/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative">
                        <div className="text-5xl sm:text-6xl mb-3 group-hover:scale-125 transition-transform duration-300 drop-shadow-lg">
                          {country.flag_emoji || "🏳️"}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white text-center line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {country.country_name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-10 text-center">
                  <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <strong className="text-blue-600 dark:text-blue-400">{countries.length}</strong> countries available
                    </p>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};
