import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ExternalLink, Pin, ShieldCheck } from "lucide-react";

interface Notice {
  id: string;
  notice_text: string;
  notice_link: string | null;
  is_pinned: boolean;
  created_at: string;
}

interface NoticeBulletinBoardProps {
  countryId: string;
}

export const NoticeBulletinBoard = ({ countryId }: NoticeBulletinBoardProps) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .eq("country_id", countryId)
      .eq("is_active", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) setNotices(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, [countryId]);

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, border: '2.5px solid #b91c1c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Loading notices...</span>
        </div>
      </div>
    );
  }

  // Reserve space when empty to prevent CLS
  if (notices.length === 0) {
    return (
      <div style={{
        minHeight: '120px', // Reserve approximate space for header + 1 item
        visibility: 'hidden'
      }} aria-hidden="true" />
    );
  }

  const handleNoticeClick = (notice: Notice) => {
    if (notice.notice_link) window.open(notice.notice_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: '24px 0 28px' }}>
      <div className="portal-container">

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: 8,
              background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(185,28,28,0.3)'
            }}>
              <Bell size={16} color="white" />
            </div>
            <div>
              <h2 style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#0a1628',
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                ⚡ Important Notices
              </h2>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0, marginTop: 1, fontWeight: 500 }}>
                {notices.length} active {notices.length === 1 ? 'notice' : 'notices'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: 5,
            padding: '5px 12px',
            fontSize: 10,
            fontWeight: 700,
            color: '#b91c1c',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            <ShieldCheck size={11} />
            Official Notices
          </div>
        </div>

        {/* Notices list */}
        <div style={{
          background: 'white',
          border: '1.5px solid #fecaca',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(185,28,28,0.08)'
        }}>
          {notices.map((notice, index) => (
            <div
              key={notice.id}
              onClick={() => handleNoticeClick(notice)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: index < notices.length - 1 ? '1px solid #fef2f2' : 'none',
                borderLeft: `4px solid ${notice.is_pinned ? '#d97706' : '#dc2626'}`,
                background: notice.is_pinned ? '#fffbeb' : 'white',
                cursor: notice.notice_link ? 'pointer' : 'default',
                transition: 'background 0.12s'
              }}
              onMouseEnter={e => {
                if (notice.notice_link) (e.currentTarget as HTMLElement).style.background = notice.is_pinned ? '#fef3c7' : '#fff5f5';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = notice.is_pinned ? '#fffbeb' : 'white';
              }}
            >
              {/* Number badge */}
              <div style={{
                width: 28,
                height: 28,
                background: `linear-gradient(135deg, ${notice.is_pinned ? '#d97706' : '#dc2626'} 0%, ${notice.is_pinned ? '#f59e0b' : '#ef4444'} 100%)`,
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 11 }}>{index + 1}</span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  {notice.is_pinned && (
                    <span className="badge-pinned">
                      <Pin size={8} /> PINNED
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>
                    {new Date(notice.created_at).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                <p style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {notice.notice_text}
                </p>
              </div>

              {/* External link icon */}
              {notice.notice_link && (
                <div style={{
                  padding: 7,
                  background: '#fee2e2',
                  borderRadius: 5,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExternalLink size={13} color="#dc2626" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0', fontWeight: 500 }}>
          💡 Click any notice to view official details on government website
        </p>
      </div>
    </div>
  );
};
