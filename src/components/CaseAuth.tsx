import { useState } from 'react';
import { Shield, KeyRound, ArrowRight, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { generateClientCaseId } from '../lib/generateCaseId';

interface CaseAuthProps {
  onLogin: (caseId: string, isNew: boolean) => void;
}

export const CaseAuth = ({ onLogin }: CaseAuthProps) => {
  const [existingIdInput, setExistingIdInput] = useState('');
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateId = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/cases/generate-id');
      if (res.ok) {
        const data = await res.json();
        setGeneratedId(data.caseId);
      } else {
        // Fallback to client-side crypto generator if server isn't reachable
        setGeneratedId(generateClientCaseId());
      }
    } catch {
      setGeneratedId(generateClientCaseId());
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartWithNew = () => {
    if (generatedId) {
      onLogin(generatedId, true);
    }
  };

  const handleLoginExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = existingIdInput.trim().toUpperCase();
    if (!cleanId) {
      setError('Please enter a valid Case ID.');
      return;
    }

    if (!cleanId.startsWith('CASE-')) {
      setError('Case ID format should be CASE-XXXXXX');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/cases/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: cleanId }),
      });

      const data = await res.json();

      if (res.ok && data.exists) {
        onLogin(cleanId, false);
      } else {
        // For MVP flexibility, if not found on server yet, allow user to continue or notify
        setError(data.error || 'Case ID not found in system. Double-check your ID.');
      }
    } catch {
      // If server check fails in demo, allow proceed
      onLogin(cleanId, false);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {/* Pillar 1: Total Anonymity / Generate New Case ID */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="icon-badge accent-blue">
            <Sparkles size={20} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>New Report</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              100% Anonymous • No Email or Identity
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          Your identity is never requested or stored. You are identified solely by a cryptographically generated one-time Case ID.
        </p>

        {!generatedId ? (
          <button
            id="btn-generate-case-id"
            className="btn btn-primary"
            onClick={handleGenerateId}
            disabled={isGenerating}
            style={{ width: '100%' }}
          >
            <Shield size={18} />
            {isGenerating ? 'Generating Secure ID...' : 'Generate New Case ID'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="id-box">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Generated Anonymous ID
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <code style={{ fontSize: '1.25rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em' }}>
                  {generatedId}
                </code>
                <button
                  id="btn-copy-case-id"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="warning-banner">
              <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8rem', color: '#fef3c7', lineHeight: '1.4' }}>
                <strong>Save this ID now!</strong> We do not store email or phone numbers. If you lose this ID, you cannot check status updates.
              </p>
            </div>

            <button
              id="btn-start-filing"
              className="btn btn-success"
              onClick={handleStartWithNew}
              style={{ width: '100%' }}
            >
              Continue to Report Filing
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Existing Case Login */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="icon-badge accent-purple">
            <KeyRound size={20} color="#c084fc" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Access Existing Case</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Check status with your Case ID
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          Enter your saved Case ID to log into your anonymous portal and check for updates.
        </p>

        <form onSubmit={handleLoginExisting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              CASE ID
            </label>
            <input
              id="input-existing-case-id"
              type="text"
              className="input-field"
              placeholder="e.g. CASE-XXXXXX"
              value={existingIdInput}
              onChange={(e) => setExistingIdInput(e.target.value.toUpperCase())}
              maxLength={15}
            />
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <button
            id="btn-login-existing-case"
            type="submit"
            className="btn btn-primary"
            disabled={isVerifying || !existingIdInput.trim()}
            style={{ width: '100%' }}
          >
            <KeyRound size={18} />
            {isVerifying ? 'Verifying Case ID...' : 'Access Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};
