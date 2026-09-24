import { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

interface AdminLoginProps {
  onAuthenticated: () => void;
}

// Demo password — in production this would be a proper server-side auth flow
const DEMO_ADMIN_PASSWORD = 'admin123';

export const AdminLogin = ({ onAuthenticated }: AdminLoginProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate a brief auth delay for realism
    await new Promise((r) => setTimeout(r, 600));

    if (password === DEMO_ADMIN_PASSWORD) {
      sessionStorage.setItem('algox_admin_auth', 'true');
      onAuthenticated();
    } else {
      setError('Incorrect password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Admin Access
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Internal Complaints Committee · Restricted Area
            </p>
          </div>
        </div>

        {/* Demo Credentials Banner — solid dark bg, readable in both dark + light mode */}
        <div
          style={{
            background: '#1e3a5f',
            border: '1px solid #3b82f6',
            borderRadius: '10px',
            padding: '0.9rem 1rem',
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <Info size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>
            <strong style={{ color: '#93c5fd', display: 'block', marginBottom: '4px' }}>
              Demo credentials
            </strong>
            Password:{' '}
            <code
              style={{
                background: '#172554',
                border: '1px solid #3b82f6',
                borderRadius: '5px',
                padding: '2px 8px',
                color: '#bfdbfe',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              admin123
            </code>
            <span
              style={{
                display: 'block',
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#94a3b8',
              }}
            >
              In production, use a proper server-side authentication system.
            </span>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-admin-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <button
            id="btn-admin-login"
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !password}
            style={{ width: '100%' }}
          >
            <KeyRound size={18} />
            {isLoading ? 'Verifying...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <p
          className="text-center mt-6"
          style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
        >
          Unauthorized access attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
};
