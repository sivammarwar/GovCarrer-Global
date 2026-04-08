import { ExternalLink, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useFamousExamsByCountry } from "@/hooks/useData";

interface FamousExamsFooterProps {
  countryId: string;
}

// Controlled palette — not a rainbow, but differentiated authority colors
const pillColors = [
  { bg: '#1e3a7a', text: 'white' },
  { bg: '#15803d', text: 'white' },
  { bg: '#7c2d12', text: 'white' },
  { bg: '#5b21b6', text: 'white' },
  { bg: '#0e7490', text: 'white' },
  { bg: '#92400e', text: 'white' },
  { bg: '#065f46', text: 'white' },
  { bg: '#1d4ed8', text: 'white' },
  { bg: '#9d174d', text: 'white' },
  { bg: '#374151', text: 'white' },
  { bg: '#44403c', text: 'white' },
  { bg: '#1e3a7a', text: 'white' },
];

export const FamousExamsFooter = ({ countryId }: FamousExamsFooterProps) => {
  const { exams, loading } = useFamousExamsByCountry(countryId);

  // Fixed height skeleton to prevent CLS - matches loaded state approximate height
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 60%, #162d5e 100%)',
        borderTop: '3px solid #d4a017',
        padding: '40px 0 44px',
        minHeight: '280px' // Reserve space to prevent layout shift
      }}>
        <div className="portal-container">
          {/* Skeleton header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: '200px',
              height: '28px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              margin: '0 auto 12px'
            }} />
            <div style={{
              width: '180px',
              height: '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px',
              margin: '0 auto 8px'
            }} />
            <div style={{
              width: '100px',
              height: '12px',
              background: 'rgba(212,160,23,0.2)',
              borderRadius: '4px',
              margin: '0 auto'
            }} />
          </div>
          {/* Skeleton pills grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            opacity: 0.3
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                height: '60px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)'
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (exams.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 60%, #162d5e 100%)',
      borderTop: '3px solid #d4a017',
      padding: '40px 0 44px'
    }}>
      <div className="portal-container">

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              padding: 9,
              background: 'rgba(212,160,23,0.15)',
              border: '1px solid rgba(212,160,23,0.35)',
              borderRadius: 7
            }}>
              <TrendingUp size={18} color="#d4a017" />
            </div>
            <h3 style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              Famous Government Exams
            </h3>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 8px', fontWeight: 500 }}>
            Complete info, notifications & official links
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, background: '#d4a017', borderRadius: '50%' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d4a017', letterSpacing: '0.06em' }}>
              {exams.length} POPULAR EXAMS
            </span>
            <span style={{ width: 6, height: 6, background: '#d4a017', borderRadius: '50%' }} />
          </div>
        </div>

        {/* Exam pills grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10
        }}>
          {exams.map((exam, index) => {
            const color = pillColors[index % pillColors.length];
            return (
              <Link
                key={exam.id}
                to={`/famous-exams/${exam.slug}`}
                className="exam-pill"
                style={{
                  background: color.bg,
                  color: color.text,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  {exam.exam_short_name || exam.exam_name}
                </span>
                {exam.exam_short_name && (
                  <span style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.65)',
                    marginTop: 4,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {exam.exam_name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom note */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5,
            padding: '7px 16px'
          }}>
            <ExternalLink size={11} color="rgba(255,255,255,0.4)" />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, fontWeight: 500 }}>
              Click any exam for complete info • Notifications • Admit Cards • Results • Syllabus
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
