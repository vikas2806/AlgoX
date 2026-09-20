import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, EyeOff, FileText, CheckCircle2 } from 'lucide-react';
import { CaseAuth } from './components/CaseAuth';
import { ComplaintForm } from './components/ComplaintForm';

export default function App() {
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(() => {
    return localStorage.getItem('algox_active_case_id');
  });
  const [isNewCase, setIsNewCase] = useState<boolean>(false);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);

  useEffect(() => {
    if (currentCaseId) {
      localStorage.setItem('algox_active_case_id', currentCaseId);
    } else {
      localStorage.removeItem('algox_active_case_id');
    }
  }, [currentCaseId]);

  const handleLogin = (caseId: string, isNew: boolean) => {
    setCurrentCaseId(caseId);
    setIsNewCase(isNew);
    setCaseStatus(null);
  };

  const handleLogout = () => {
    setCurrentCaseId(null);
    setIsNewCase(false);
    setCaseStatus(null);
  };

  const handleComplaintSubmitted = (status: string) => {
    setCaseStatus(status);
    setIsNewCase(false);
  };

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={20} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Algo<span style={{ color: '#3b82f6' }}>X</span>
            </h1>
            <span className="pillar-tag">Pillar 1: Total Anonymity</span>
            <span className="pillar-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>
              Pillar 2: Blind Server
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Metadata-camouflaged workplace harassment reporting &amp; status tracking
          </p>
        </div>

        {currentCaseId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIVE CASE:</span>
              <code style={{ fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd' }}>{currentCaseId}</code>
            </div>
            <button
              id="btn-logout"
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <LogOut size={15} />
              Exit Session
            </button>
          </div>
        )}
      </header>

      {/* Main View */}
      <main>
        {!currentCaseId ? (
          <CaseAuth onLogin={handleLogin} />
        ) : isNewCase ? (
          <ComplaintForm caseId={currentCaseId} onSuccess={handleComplaintSubmitted} />
        ) : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-badge accent-emerald">
                  <CheckCircle2 size={20} color="#34d399" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Case Tracker</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Case ID: <code style={{ color: '#93c5fd' }}>{currentCaseId}</code>
                  </p>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setIsNewCase(true)}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
              >
                <FileText size={14} />
                Submit Additional Report
              </button>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93c5fd', fontSize: '0.85rem' }}>
                <EyeOff size={16} />
                <span>Current Status: <strong style={{ color: '#34d399' }}>{caseStatus || 'Received'}</strong></span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Your encrypted case is stored safely. In upcoming tasks, admin management and padded/batched status polling will be linked to this portal.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
