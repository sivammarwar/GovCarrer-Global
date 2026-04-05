import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f3f8', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 100%)',
        borderBottom: '3px solid #d4a017',
        padding: '0 24px'
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #d4a017 0%, #f0cc5a 100%)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 14, height: 14, color: '#0a1628' }} />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Global Government Jobs Portal</span>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          background: 'white', borderRadius: 8, border: '1px solid #e2e8f0',
          boxShadow: '0 2px 12px rgba(10,22,40,0.08)', padding: '48px 40px',
          textAlign: 'center', maxWidth: 400
        }}>
          <div style={{
            width: 72, height: 72, background: '#f0f3f8', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', border: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#1e3a7a' }}>404</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 10px' }}>Page Not Found</h1>
          <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6, margin: '0 0 28px' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <a
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', background: '#0f2044', color: 'white',
              fontWeight: 700, fontSize: 13, borderRadius: 5, textDecoration: 'none',
              letterSpacing: '0.03em'
            }}
          >
            Return to Home
          </a>
        </div>
      </div>

      <footer style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2044 100%)', borderTop: '3px solid #d4a017', padding: '20px 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
            © {new Date().getFullYear()} Global Government Jobs Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;