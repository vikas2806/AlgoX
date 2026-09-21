import { useState } from 'react';
import { Lock, Send, CheckCircle2, FileText, AlertCircle, ShieldCheck } from 'lucide-react';

interface ComplaintFormProps {
  caseId: string;
  onSuccess: (publicStatus: string) => void;
}

const CATEGORIES = [
  'Workplace Harassment',
  'Hostile Work Environment',
  'Retaliation / Threat',
  'Discrimination / Bias',
  'Unethical / Illegal Conduct',
  'Other Sensitive Incident',
];

export const ComplaintForm = ({ caseId, onSuccess }: ComplaintFormProps) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [complaintText, setComplaintText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionProof, setSubmissionProof] = useState<{
    ciphertextSize: number;
    submittedAt: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      setError('Please describe what happened before submitting.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          category,
          complaintText: complaintText.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmissionProof({
          ciphertextSize: data.ciphertextSize,
          submittedAt: data.submittedAt,
        });
        setTimeout(() => {
          onSuccess(data.publicStatus || 'Received');
        }, 2200);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not connect. Please check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="icon-badge accent-blue">
          <FileText size={20} color="#60a5fa" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Your Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Linked to Report ID: <code style={{ color: '#93c5fd' }}>{caseId}</code>
          </p>
        </div>
      </div>

      {submissionProof ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckCircle2 size={32} color="#34d399" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f3f4f6' }}>
              Report Submitted Successfully
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Your report has been securely saved. Your identity remains completely private.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Taking you to your report status...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              WHAT TYPE OF INCIDENT IS THIS?
            </label>
            <select
              id="select-category"
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} style={{ background: '#111827', color: '#f3f4f6' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              WHAT HAPPENED?
            </label>
            <textarea
              id="textarea-complaint-text"
              className="input-field"
              rows={6}
              placeholder="Describe the incident in your own words. You don't need to include your name or any personal details — your identity is fully protected..."
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              style={{ resize: 'vertical', lineHeight: '1.5', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
            />
          </div>

          {/* Privacy assurance notice */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldCheck size={16} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong style={{ color: '#e5e7eb' }}>Your privacy is protected.</strong>
              <br />
              Your report is securely encrypted before being stored. No one can read it except authorized HR personnel. Your name and identity are never recorded.
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              id="btn-submit-complaint"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !complaintText.trim()}
              style={{ minWidth: '180px' }}
            >
              {isSubmitting ? (
                <>
                  <Lock size={16} />
                  Submitting securely...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
