import { ShieldCheck, User, UserCog, Lock, Eye, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: 'user' | 'admin') => void;
}

export const LandingPage = ({ onSelectRole }: LandingPageProps) => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5rem',
        padding: '2rem 1rem',
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
          }}
        >
          <ShieldCheck size={34} color="#ffffff" />
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '0.6rem',
          }}
        >
          Welcome to Algo<span style={{ color: '#60a5fa' }}>X</span>
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.65',
          }}
        >
          A secure, anonymous case-tracking portal for workplace complaints.
          Your identity is always protected.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          width: '100%',
          maxWidth: '580px',
        }}
      >
        {/* Employee / My Report Card */}
        <button
          id="landing-btn-user"
          onClick={() => onSelectRole('user')}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.65)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 8px 24px rgba(59,130,246,0.18)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.3)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={22} color="#60a5fa" />
          </div>

          {/* Text */}
          <div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              My Report
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              File a new anonymous complaint or check the status of an existing report. No personal
              info required.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['Anonymous', 'Encrypted', 'Trackable'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#93c5fd',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#60a5fa',
              marginTop: 'auto',
            }}
          >
            Get started <ArrowRight size={15} />
          </div>
        </button>

        {/* Admin Card */}
        <button
          id="landing-btn-admin"
          onClick={() => onSelectRole('admin')}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '16px',
            padding: '1.75rem 1.5rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.65)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 8px 24px rgba(139,92,246,0.18)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.3)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCog size={22} color="#a78bfa" />
          </div>

          {/* Text */}
          <div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Admin Portal
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              ICC committee members can review, decrypt, and manage submitted reports. Requires
              credentials.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['Restricted', 'Audited', 'ICC Only'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: '#c4b5fd',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#a78bfa',
              marginTop: 'auto',
            }}
          >
            <Lock size={13} />
            Sign in required
          </div>
        </button>
      </div>

      {/* Trust footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { icon: <Lock size={13} color="#6b7280" />, label: 'End-to-end encrypted' },
          { icon: <Eye size={13} color="#6b7280" />, label: 'Identity never recorded' },
          { icon: <ShieldCheck size={13} color="#6b7280" />, label: 'Side-channel protected' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            {icon}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};
