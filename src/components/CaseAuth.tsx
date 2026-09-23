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
      setError('Please enter your Report ID.');
      return;
    }

    if (!cleanId.startsWith('CASE-')) {
      setError('Report ID should look like CASE-XXXXXX');
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
        setError(data.error || 'Report ID not found. Please double-check it.');
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
      {/* Start a New Report */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="icon-badge accent-blue">
            <Sparkles size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Make a New Report</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              100% Anonymous · No personal info needed
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
          We never ask for your name, email, or phone number. You'll get a unique Report ID to track your case safely.
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
            {isGenerating ? 'Creating your Report ID...' : 'Start Anonymous Report'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="id-box">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Private Report ID
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <code style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                  {generatedId}
                </code>
                <button
                  id="btn-copy-case-id"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {copied ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="warning-banner">
              <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                <strong>Save this ID before continuing.</strong> You'll need it later to check updates on your report. We don't store your contact info.
              </p>
            </div>

            <button
              id="btn-start-filing"
              className="btn btn-success"
              onClick={handleStartWithNew}
              style={{ width: '100%' }}
            >
              Continue to Report
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Check an Existing Report */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="icon-badge accent-purple">
            <KeyRound size={20} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Check My Report</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              View updates on an existing report
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
          Already submitted a report? Enter your Report ID below to see the latest status.
        </p>

        <form onSubmit={handleLoginExisting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              REPORT ID
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
              <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
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
            {isVerifying ? 'Looking up your report...' : 'View My Report'}
          </button>
        </form>
      </div>
    </div>
  );
};
