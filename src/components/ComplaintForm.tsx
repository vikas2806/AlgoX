import { useState } from 'react';
import { Lock, Send, CheckCircle2, FileText, AlertCircle, Cpu } from 'lucide-react';

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
      setError('Please provide incident details.');
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
        setError(data.error || 'Failed to submit complaint.');
      }
    } catch {
      setError('Network error submitting complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-badge accent-blue">
            <FileText size={20} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>File Confidential Report</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Bound anonymously to <code style={{ color: '#93c5fd' }}>{caseId}</code>
            </p>
          </div>
        </div>

        <span className="pillar-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
          Pillar 2: Blind Server Active
        </span>
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
              Report Encrypted &amp; Stored Successfully
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Ciphertext ({submissionProof.ciphertextSize} bytes) secured in database. Plaintext wiped from memory.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Redirecting to anonymous status portal...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              INCIDENT TYPE
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
              INCIDENT DESCRIPTION (PLAINTEXT NEVER LOGGED)
            </label>
            <textarea
              id="textarea-complaint-text"
              className="input-field"
              rows={6}
              placeholder="Describe the incident objectively. Avoid including your own personal identifying information (e.g. your name or personal phone number) to ensure absolute confidentiality..."
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              style={{ resize: 'vertical', lineHeight: '1.5', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
            />
          </div>

          {/* Blind Server Pillar Box */}
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
              <Cpu size={16} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
              <strong style={{ color: '#e5e7eb' }}>Blind Server Cryptographic Protocol:</strong>
              <br />
              Your report is encrypted using <strong>AES-256-GCM</strong> on ingest. The backend database only stores encrypted ciphertext blocks, IVs, and authentication tags. Plaintext is never stored in files or server logs.
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
                  Encrypting &amp; Saving...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Encrypted Report
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
