import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { ExternalLink, ArrowLeft, Loader2, BookOpen, Calendar, FileText, Award, Bell, ShieldCheck, Lock, Users, TrendingUp } from 'lucide-react';

export const FamousExamDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['famousExam', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_famous_exams')
        .select(`*, countries(country_name, country_code, flag_emoji)`)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleBackClick = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f3f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #1e3a7a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 15 }}>Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f3f8' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
          <Award style={{ width: 64, height: 64, color: '#d1d5db', margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Exam Not Found</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>The exam you're looking for doesn't exist or has been removed.</p>
          <button onClick={handleBackClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0f2044', color: 'white', fontWeight: 600, fontSize: 14, borderRadius: 5, border: 'none', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
          </button>
        </div>
      </div>
    );
  }

  const displayName = exam.exam_short_name || exam.exam_name;
  const country = exam.countries;
  const currentUrl = `${window.location.origin}/famous-exams/${exam.slug}`;

  const quickLinks = [
    { icon: FileText, title: 'Notification', desc: 'Official notification PDF', color: '#2563eb', bg: '#eff6ff', border: '#2563eb' },
    { icon: Calendar, title: 'Admit Card', desc: 'Download hall ticket', color: '#7c3aed', bg: '#f5f3ff', border: '#7c3aed' },
    { icon: Award, title: 'Results', desc: 'Check your results', color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
    { icon: BookOpen, title: 'Syllabus', desc: 'View exam syllabus', color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  ];

  return (
    <>
      <Helmet>
        <title>{exam.meta_title || `${displayName} - Complete Information Guide`}</title>
        <meta name="description" content={exam.meta_description || `Complete guide for ${displayName}`} />
        <meta name="keywords" content={exam.keywords || displayName} />
        <link rel="canonical" href={currentUrl} />
        <meta property="og:title" content={exam.meta_title || displayName} />
        <meta property="og:description" content={exam.meta_description || `Complete guide for ${displayName}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
      </Helmet>

      <div style={{ minHeight: '100vh', background: '#f0f3f8' }}>

        {/* Sticky Header */}
        <header style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 100%)',
          borderBottom: '3px solid #d4a017', position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 2px 12px rgba(10,22,40,0.3)'
        }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
              <button onClick={handleBackClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <ArrowLeft style={{ width: 15, height: 15 }} /> Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: '#0a1628' }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                  {country?.flag_emoji} {country?.country_name} — Famous Exam Guide
                </span>
              </div>
              <a href={exam.official_website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f0cc5a', fontWeight: 700, textDecoration: 'none' }}>
                Official Website <ExternalLink style={{ width: 11, height: 11 }} />
              </a>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 48px' }}>

          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f2044 0%, #1e3a7a 60%, #2450a0 100%)',
            borderBottom: '3px solid #d4a017', borderRadius: 8, padding: '36px 40px',
            marginBottom: 20, position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 52, lineHeight: 1 }}>{country?.flag_emoji}</span>
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(212,160,23,0.18)', border: '1px solid rgba(212,160,23,0.4)',
                        borderRadius: 4, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                        color: '#f0cc5a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8
                      }}>
                        Official Exam Guide
                      </span>
                      <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                        {displayName}
                      </h1>
                    </div>
                  </div>
                  {exam.exam_short_name && (
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '0 0 16px' }}>{exam.exam_name}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { icon: ShieldCheck, label: country?.country_name },
                      { icon: Users, label: 'Government Examination' },
                      { icon: TrendingUp, label: 'Most Popular' },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)'
                      }}>
                        <Icon style={{ width: 11, height: 11 }} /> {label}
                      </span>
                    ))}
                  </div>
                </div>
                
                <a
                  href={exam.official_website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)',
                    color: '#0a1628', padding: '12px 22px', borderRadius: 6, fontWeight: 800,
                    fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(212,160,23,0.4)'
                  }}
                >
                  <Bell style={{ width: 14, height: 14 }} />
                  Visit Official Website
                  <ExternalLink style={{ width: 13, height: 13 }} />
                </a>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { value: '1000+', label: 'Daily Updates', color: '#2563eb', bg: '#eff6ff', border: '#2563eb' },
              { value: '500K+', label: 'Active Aspirants', color: '#7c3aed', bg: '#f5f3ff', border: '#7c3aed' },
              { value: '100%', label: 'Verified Info', color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
            ].map(({ value, label, color, bg, border }) => (
              <div key={label} style={{ background: 'white', border: `1px solid ${border}`, borderLeft: `4px solid ${border}`, borderRadius: 8, padding: '16px 20px' }}>
                <p style={{ fontSize: 24, fontWeight: 900, color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{value}</p>
                <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(10,22,40,0.07)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ background: '#f0f2f5', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen style={{ width: 12, height: 12, color: '#1e3a7a' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a7a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>QUICK ACCESS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
              {quickLinks.map(({ icon: Icon, title, desc, color, bg, border }, idx) => (
                <div key={title} style={{
                  padding: '20px 18px', textAlign: 'center', cursor: 'pointer',
                  borderRight: idx < 3 ? '1px solid #f0f2f5' : 'none',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 44, height: 44, background: bg, border: `1px solid ${border}20`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Icon style={{ width: 20, height: 20, color }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{title}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Card */}
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(10,22,40,0.07)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ background: '#f0f2f5', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen style={{ width: 12, height: 12, color: '#1e3a7a' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a7a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ABOUT {displayName.toUpperCase()}</span>
            </div>
            <div style={{ padding: '24px 28px' }}>
              {exam.page_content ? (
                <div
                  className="exam-content prose prose-lg max-w-none bg-white text-gray-900
                    [&_*]:text-gray-900 [&_p]:text-gray-900 [&_p]:leading-relaxed [&_p]:mb-4
                    [&_h2]:text-blue-700 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:border-l-4 [&_h2]:border-blue-600 [&_h2]:pl-3
                    [&_h3]:text-gray-900 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3
                    [&_table]:w-full [&_table]:border-collapse [&_table]:shadow-md [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:mb-6
                    [&_thead]:bg-blue-600 [&_th]:text-white [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold
                    [&_td]:border [&_td]:border-gray-200 [&_td]:px-4 [&_td]:py-3 [&_td]:text-gray-900
                    [&_strong]:text-gray-900 [&_strong]:font-bold
                    [&_a]:text-blue-600 [&_a]:underline
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:ml-4 [&_ul]:mb-4
                    [&_li]:text-gray-900 [&_li]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: exam.page_content }}
                  style={{ color: '#111827' }}
                />
              ) : (
                <div>
                  <p style={{ color: '#374151', lineHeight: 1.8, fontSize: 14, margin: '0 0 20px' }}>
                    {displayName} ({exam.exam_name}) is one of the most prestigious examinations conducted in {country?.country_name}.
                    This examination opens doors to excellent career opportunities and is highly sought after by candidates across the country.
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', padding: '18px 22px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f2044', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Website</p>
                    <a href={exam.official_website} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1e3a7a', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                    >
                      {exam.official_website} <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  </div>
                  <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                    {[
                      'Check official notifications regularly for exam updates',
                      'Download admit cards well before the exam date',
                      'Review the syllabus and exam pattern thoroughly',
                      'Stay updated with result announcements',
                      'Follow official social media channels for instant updates',
                    ].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 6 }}>
                        <span style={{ color: '#1e3a7a', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* CTA Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f2044 0%, #1e3a7a 100%)',
            borderRadius: 8, border: '1px solid #2450a0', borderBottom: '3px solid #d4a017',
            padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 20
          }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: '0 0 5px' }}>Stay Updated!</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                Visit the official website regularly for the latest notifications, admit cards, and exam updates
              </p>
            </div>
            <a href={exam.official_website} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)',
                color: '#0a1628', padding: '11px 22px', borderRadius: 5, fontWeight: 800,
                fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              Go to Official Website →
            </a>
          </div>

          {/* Official Notice */}
          <div style={{ background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ padding: '7px 10px', background: '#1e3a7a', borderRadius: 5, flexShrink: 0, marginTop: 2 }}>
                <ShieldCheck style={{ width: 16, height: 16, color: 'white' }} />
              </div>
              <p style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                This portal is an <strong>independent service</strong> and is not affiliated with any government organization.
                All links redirect to <strong>official government websites</strong> for your security and accuracy.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1e3a7a', color: 'white', fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Lock style={{ width: 10, height: 10 }} /> VERIFIED LINKS
              </div>
            </div>
          </div>
        </main>

        <footer style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 100%)', borderTop: '3px solid #d4a017', padding: '24px 0', marginTop: 24 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
              © {new Date().getFullYear()} Global Government Jobs Portal. All rights reserved.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '6px 0 0' }}>
              Information sourced from official government websites. Visit official portals for accurate details.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};