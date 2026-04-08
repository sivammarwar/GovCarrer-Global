import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { NoticeTicker } from "./NoticeTicker";
import { NoticeBulletinBoard } from "./NoticeBulletinBoard";
import { NoticeBoardMarquee } from "./Noticeboardmarquee";
import { FamousExamsFooter } from "./FamousExamsFooter";
import { DynamicSectionComponent } from "./DynamicSection";
import { useDynamicSections } from "@/hooks/useDynamicSections";
import { DbCountry } from "@/hooks/useData";
import { ShieldCheck, Lock } from "lucide-react";

interface DashboardProps {
  country: DbCountry;
  onChangeCountry: () => void;
}

type TabType = string;

const getColorValue = (color: string): string => {
  const colorMap: Record<string, string> = {
    red: "#dc2626",
    green: "#16a34a",
    blue: "#2563eb",
    purple: "#7c3aed",
    orange: "#ea580c",
    yellow: "#ca8a04",
    pink: "#db2777",
    indigo: "#4f46e5",
  };
  return colorMap[color] || "#2563eb";
};

export const Dashboard = ({ country: initialCountry, onChangeCountry }: DashboardProps) => {
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const { sections: dynamicSections, loading: sectionsLoading } = useDynamicSections();
  const [activeTab, setActiveTab] = useState<string>("");

  // Set default active tab once sections load
  useEffect(() => {
    if (dynamicSections.length > 0 && !activeTab) {
      setActiveTab(dynamicSections[0].slug);
    }
  }, [dynamicSections, activeTab]);

  // Debug logging
  console.log("Dynamic sections:", dynamicSections);
  console.log("Active tab:", activeTab);

  const handleCountryChange = (country: DbCountry) => {
    setSelectedCountry(country);
  };

  const renderActiveSection = () => {
    const dynamicSection = dynamicSections.find(s => s.slug === activeTab);
    if (dynamicSection) {
      return (
        <DynamicSectionComponent
          section={dynamicSection}
          countryId={selectedCountry.id}
          isActive={true}
          onClick={() => {}}
        />
      );
    }
    // Return skeleton placeholder instead of null to prevent CLS
    return (
      <div style={{
        minHeight: '300px',
        background: '#e2e8f0',
        borderRadius: '8px',
        opacity: 0.3
      }} aria-hidden="true" />
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f3f8' }}>

      <Header country={selectedCountry} onChangeCountry={handleCountryChange} />

      {/* NOTICE TICKER */}
      <div style={{ borderBottom: '1px solid #e2e8f0' }}>
        <NoticeTicker countryId={selectedCountry.id} />
      </div>

      <main className="portal-container flex-1" style={{ paddingTop: 20, paddingBottom: 32, contentVisibility: 'auto', containIntrinsicHeight: '600px', minHeight: '500px' }}>

        {/* ── Dynamic Tab Navigation ───────────────────── */}
        {sectionsLoading ? (
          // Skeleton for tabs - prevents CLS by reserving space
          <div style={{
            display: 'grid',
            gap: '12px',
            marginBottom: '24px',
            width: '100%',
            minHeight: '60px'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: '120px',
                  height: '52px',
                  background: '#e2e8f0',
                  borderRadius: '8px',
                  opacity: 0.5
                }} />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="timeline-tab-container"
            style={{
              display: 'grid',
              gap: '12px',
              marginBottom: '24px',
              width: '100%'
            }}
          >
            {dynamicSections.map((section) => {
            const isActive = activeTab === section.slug;
            const color = getColorValue(section.color);
            return (
              <button
                key={section.slug}
                onClick={() => setActiveTab(section.slug)}
                style={{
                  padding: '16px 20px',
                  background: isActive ? color : 'white',
                  color: isActive ? 'white' : '#64748b',
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 4px 12px ${color}40` : '0 1px 3px rgba(0,0,0,0.05)',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.color = color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {section.name}
              </button>
            );
          })}
          </div>
        )}

        {/* ── Active Section Content ───────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          {renderActiveSection()}
        </div>

        {/* ── Notice Board Marquee ──────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <NoticeBoardMarquee countryId={selectedCountry.id} />
        </div>

        {/* ── Official Disclaimer ───────────────────────────── */}
        <div className="official-notice" style={{ minHeight: '90px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              padding: '7px 10px',
              background: '#1e3a7a',
              borderRadius: 5,
              flexShrink: 0,
              marginTop: 2
            }}>
              <ShieldCheck size={16} color="white" />
            </div>
            <div>
              <p style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#1e3a7a',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 5px 0'
              }}>
                Important Notice — Independent Portal
              </p>
              <p style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                This portal is an <strong>independent service</strong> and is not affiliated with any government organization.
                All links redirect to <strong>official government websites</strong> for your security and accuracy.
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#1e3a7a',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
              flexShrink: 0
            }}>
              <Lock size={10} />
              VERIFIED LINKS
            </div>
          </div>
        </div>

      </main>

      {/* ── Notice Bulletin Board ─────────────────────────────── */}
      <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', minHeight: '120px' }}>
        <NoticeBulletinBoard countryId={selectedCountry.id} />
      </div>

      {/* ── Famous Exams Footer ───────────────────────────────── */}
      <div style={{ minHeight: '280px' }}>
        <FamousExamsFooter countryId={selectedCountry.id} />
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 100%)',
        borderTop: '3px solid #d4a017',
        padding: '28px 0',
        minHeight: '100px'
      }}>
        <div className="portal-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldCheck size={18} color="#0a1628" />
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                  © 2026 Global Government Jobs Portal
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0, marginTop: 2 }}>
                  Your trusted source for government opportunities worldwide
                </p>
              </div>
            </div>

            <Link
              to="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 5,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s'
              }}
            >
              Admin Portal →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
