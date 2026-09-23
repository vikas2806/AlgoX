import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, User, UserCog, Sun, Moon } from 'lucide-react';
import { CaseAuth } from './components/CaseAuth';
import { ComplaintForm } from './components/ComplaintForm';
import { AdminPortal } from './components/AdminPortal';
import { StatusPortal } from './components/StatusPortal';

type Theme = 'light' | 'dark';

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(() => {
    return localStorage.getItem('algox_active_case_id');
  });
  const [isNewCase, setIsNewCase] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('algox_theme') as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('algox_theme', theme);
  }, [theme]);

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
  };

  const handleLogout = () => {
    setCurrentCaseId(null);
    setIsNewCase(false);
  };

  const handleComplaintSubmitted = (_status: string) => {
    setIsNewCase(false);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen flex flex-col">
      {/* Top Header & Role Switcher */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Algo<span className="text-blue-500">X</span>
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Safe, anonymous workplace reporting — your identity stays private.
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light/dark mode"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {isDark ? <Sun size={14} style={{ color: '#f59e0b' }} /> : <Moon size={14} style={{ color: '#6366f1' }} />}
            {/* Toggle track */}
            <span className="theme-toggle__track" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
              <span className="theme-toggle__thumb" />
            </span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Tab Switcher */}
          <div
            style={{
              background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(238,240,251,0.95)',
              padding: '0.25rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)',
            }}
          >
            <button
              id="tab-user-view"
              onClick={() => setActiveTab('user')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'user' ? '#2563eb' : 'transparent',
                color: activeTab === 'user' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <User size={14} />
              My Report
            </button>
            <button
              id="tab-admin-view"
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'admin' ? '#7c3aed' : 'transparent',
                color: activeTab === 'admin' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <UserCog size={14} />
              Admin
            </button>
          </div>

          {activeTab === 'user' && currentCaseId && (
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'admin' ? (
          <AdminPortal />
        ) : (
          <div>
            {!currentCaseId ? (
              <CaseAuth onLogin={handleLogin} />
            ) : isNewCase ? (
              <ComplaintForm caseId={currentCaseId} onSuccess={handleComplaintSubmitted} />
            ) : (
              <StatusPortal
                caseId={currentCaseId}
                onFileAdditional={() => setIsNewCase(true)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
