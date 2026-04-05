import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Megaphone } from 'lucide-react';

interface Notice {
  id: string;
  notice_text: string;
  notice_link: string | null;
  is_pinned: boolean;
  created_at: string;
}

interface NoticeBoardMarqueeProps {
  countryId?: string;
}

export const NoticeBoardMarquee = ({ countryId }: NoticeBoardMarqueeProps) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchNotices(); }, [countryId]);

  useEffect(() => {
    if (notices.length > 0 && containerRef.current && contentRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const contentWidth = contentRef.current.scrollWidth;
      setShouldScroll(contentWidth > containerWidth);
    }
  }, [notices]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (countryId) {
        query = query.or(`country_id.eq.${countryId},country_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(90deg, #0a1628 0%, #162d5e 100%)',
        borderTop: '3px solid #d4a017',
        borderBottom: '3px solid #d4a017',
        padding: '10px 0'
      }}>
        <div className="portal-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Loading notices...</span>
          </div>
        </div>
      </div>
    );
  }

  if (notices.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #0a1628 0%, #162d5e 100%)',
      borderTop: '3px solid #d4a017',
      borderBottom: '3px solid #d4a017',
      padding: '11px 0',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(10,22,40,0.25)'
    }}>
      <div className="portal-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Label */}
          <div style={{
            background: '#d4a017',
            color: '#0a1628',
            fontWeight: 800,
            fontSize: 10,
            padding: '4px 12px',
            borderRadius: 3,
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            textTransform: 'uppercase',
            boxShadow: '0 1px 4px rgba(212,160,23,0.4)'
          }}>
            <Megaphone size={10} />
            Notice Board
          </div>

          {/* Scrolling content */}
          <div style={{ flex: 1, overflow: 'hidden' }} ref={containerRef}>
            <div
              ref={contentRef}
              style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
              className={shouldScroll ? 'animate-marquee' : ''}
            >
              {/* Primary content */}
              {notices.map((notice, index) => (
                <span key={notice.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {notice.notice_link ? (
                    <a
                      href={notice.notice_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f0cc5a'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
                    >
                      {notice.notice_text}
                      <ExternalLink size={10} style={{ opacity: 0.6 }} />
                    </a>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
                      {notice.notice_text}
                    </span>
                  )}
                  {index < notices.length - 1 && (
                    <span style={{ color: '#d4a017', margin: '0 16px', fontWeight: 800 }}>◆</span>
                  )}
                </span>
              ))}

              {/* Duplicate for seamless scroll */}
              {shouldScroll && notices.map((notice, index) => (
                <span key={`dup-${notice.id}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ color: '#d4a017', margin: '0 16px', fontWeight: 800 }}>◆</span>
                  {notice.notice_link ? (
                    <a
                      href={notice.notice_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      {notice.notice_text}
                      <ExternalLink size={10} style={{ opacity: 0.6 }} />
                    </a>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
                      {notice.notice_text}
                    </span>
                  )}
                  {index < notices.length - 1 && (
                    <span style={{ color: '#d4a017', margin: '0 16px', fontWeight: 800 }}>◆</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};