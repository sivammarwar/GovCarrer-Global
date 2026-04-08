import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ExternalLink } from "lucide-react";

interface Notice {
  id: string;
  notice_text: string;
  notice_link: string | null;
  is_pinned: boolean;
  created_at: string;
}

interface NoticeTickerProps {
  countryId: string;
}

export const NoticeTicker = ({ countryId }: NoticeTickerProps) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .eq("country_id", countryId)
      .eq("is_active", true)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false });

    if (!error && data) setNotices(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, [countryId]);

  // Fixed height skeleton to prevent CLS
  if (loading) {
    return (
      <div style={{
        background: '#b91c1c',
        minHeight: '40px',
        padding: '9px 0',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="portal-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'white',
              color: '#b91c1c',
              fontWeight: 800,
              fontSize: 10,
              padding: '3px 10px',
              borderRadius: 3,
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexShrink: 0
            }}>
              <Bell size={10} /> LATEST
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Loading notices...</span>
          </div>
        </div>
      </div>
    );
  }

  // Reserve space even when empty to prevent CLS
  if (notices.length === 0) {
    return (
      <div style={{
        background: '#b91c1c',
        minHeight: '40px', // Reserve space
        padding: '9px 0',
        visibility: 'hidden' // Hidden but takes up space
      }} aria-hidden="true" />
    );
  }

  const handleNoticeClick = (notice: Notice) => {
    if (notice.notice_link) window.open(notice.notice_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      background: '#b91c1c',
      padding: '9px 0',
      overflow: 'hidden'
    }}>
      <div className="portal-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Label */}
          <div style={{
            background: 'white',
            color: '#b91c1c',
            fontWeight: 800,
            fontSize: 10,
            padding: '4px 12px',
            borderRadius: 3,
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            textTransform: 'uppercase'
          }}>
            <Bell size={10} />
            📢 Latest
          </div>

          {/* Scrolling notices */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0 12px' }}>
              {notices.map((notice, index) => (
                <span key={notice.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    onClick={() => handleNoticeClick(notice)}
                    style={{
                      fontSize: 12.5,
                      color: 'white',
                      fontWeight: 600,
                      cursor: notice.notice_link ? 'pointer' : 'default',
                      textDecoration: notice.notice_link ? 'underline' : 'none',
                      textDecorationColor: 'rgba(255,255,255,0.4)',
                      textUnderlineOffset: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    {notice.notice_text}
                    {notice.notice_link && <ExternalLink size={10} style={{ opacity: 0.7 }} />}
                  </span>
                  {index < notices.length - 1 && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: 14 }}>•</span>
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
