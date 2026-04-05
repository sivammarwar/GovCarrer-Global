import { useState, useEffect, useRef } from "react";
import { Globe, ChevronDown, ShieldCheck, CheckCircle } from "lucide-react";
import { DbCountry, useCountries } from "@/hooks/useData";

// WhatsApp Icon Component
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface HeaderProps {
  country: DbCountry;
  onChangeCountry: (country: DbCountry) => void;
}

export const Header = ({ country, onChangeCountry }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { countries } = useCountries();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (selectedCountry: DbCountry) => {
    onChangeCountry(selectedCountry);
    setIsOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 50%, #162d5e 100%)',
      borderBottom: '3px solid #d4a017',
      boxShadow: '0 4px 20px rgba(10,22,40,0.35)'
    }}>
      <div className="portal-container" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* ── Logo ───────────────────────────────────────── */}
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo Image */}
            <img 
              src="/favicon.svg" 
              alt="KV Results Logo" 
              style={{
                width: 46,
                height: 46,
                borderRadius: 8,
                objectFit: 'contain',
                background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)',
                padding: 4,
                boxShadow: '0 2px 10px rgba(212,160,23,0.4)',
                flexShrink: 0
              }}
            />

            <div className="header-text">
              <h1 style={{
                color: 'white',
                fontWeight: 800,
                fontSize: 18,
                margin: 0,
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                KV Results
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <p className="header-subtitle" style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  margin: 0,
                  fontWeight: 500,
                  letterSpacing: '0.04em'
                }}>
                  Government Exam Results & Career Updates
                </p>
                <span className="header-badge" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(212,160,23,0.15)',
                  border: '1px solid rgba(212,160,23,0.35)',
                  borderRadius: 3,
                  padding: '1px 7px',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#f0cc5a',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  <ShieldCheck size={8} />
                  Verified Portal
                </span>
              </div>
            </div>
          </div>

          {/* ── Country Selector ────────────────────────────── */}
          <div className="header-country-selector" style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="header-country-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                ...(isOpen ? {
                  borderColor: '#d4a017',
                  background: 'rgba(255,255,255,0.12)'
                } : {})
              }}
            >
              <span className="header-country-flag" style={{ fontSize: 26, lineHeight: 1 }}>
                {country.flag_emoji || "🏳️"}
              </span>
              <div className="header-country-text" style={{ textAlign: 'left' }}>
                <p style={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {country.country_name}
                </p>
                <p className="header-country-code" style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 10,
                  margin: 0,
                  fontWeight: 500,
                  letterSpacing: '0.05em'
                }}>
                  {country.country_code} — Change Country
                </p>
              </div>
              <ChevronDown
                size={16}
                color="rgba(255,255,255,0.6)"
                style={{
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>

            {/* ── Dropdown ──────────────────────────────────── */}
            {isOpen && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 300,
                  background: 'white',
                  border: '1.5px solid #c8d4ea',
                  borderRadius: 8,
                  boxShadow: '0 12px 40px rgba(10,22,40,0.22)',
                  zIndex: 50,
                  overflow: 'hidden'
                }}
              >
                {/* Dropdown header strip */}
                <div style={{
                  background: 'linear-gradient(90deg, #0a1628 0%, #162d5e 100%)',
                  padding: '11px 16px',
                  borderBottom: '2px solid #d4a017'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={14} color="white" />
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 11, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Select Country
                    </p>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '2px 0 0 0' }}>
                    {countries.length} countries available
                  </p>
                </div>

                {/* Countries list */}
                <div
                  style={{ maxHeight: 340, overflowY: 'auto' }}
                  className="scroll-list"
                >
                  {countries.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCountrySelect(c)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        background: c.id === country.id ? '#f0f4fb' : 'white',
                        borderLeft: c.id === country.id ? '3px solid #1e3a7a' : '3px solid transparent',
                        border: 'none',
                        borderBottom: '1px solid #f0f2f5',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (c.id !== country.id) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        if (c.id !== country.id) (e.currentTarget as HTMLElement).style.background = 'white';
                      }}
                    >
                      <span style={{ fontSize: 24, lineHeight: 1 }}>{c.flag_emoji || "🏳️"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: c.id === country.id ? '#1e3a7a' : '#111827',
                          margin: 0
                        }}>
                          {c.country_name}
                        </p>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontWeight: 500 }}>
                          {c.country_code}
                        </p>
                      </div>
                      {c.id === country.id && (
                        <CheckCircle size={14} color="#1e3a7a" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Channel Banner */}
      <a
        href="https://whatsapp.com/channel/0029Vb6zQ8X5fM5YiaF55r42"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '10px 16px',
          background: '#25D366',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#128C7E';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#25D366';
        }}
      >
        <WhatsAppIcon />
        <span>Join our WhatsApp Channel for Latest Updates</span>
      </a>
    </header>
  );
};