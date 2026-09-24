import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, User, UserCog, Sun, Moon, Home } from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { CaseAuth } from './components/CaseAuth';
import { ComplaintForm } from './components/ComplaintForm';
import { AdminPortal } from './components/AdminPortal';
import { AdminLogin } from './components/AdminLogin';
import { StatusPortal } from './components/StatusPortal';

// Possible top-level views
type AppView = 'landing' | 'user' | 'admin';

export default function App() {
  // The very first screen — always start at landing unless we already have a session
  const [appView, setAppView] = useState<AppView>(() => {
    // If there's an active case in storage, jump straight to user view
    if (localStorage.getItem('algox_active_case_id')) return 'user';
    // If admin was already authenticated this session, jump to admin
    if (sessionStorage.getItem('algox_admin_auth') === 'true') return 'admin';
    return 'landing';
  });

  const [currentCaseId, setCurrentCaseId] = useState<string | null>(() => {
    return localStorage.getItem('algox_active_case_id');
  });
  const [isNewCase, setIsNewCase] = useState<boolean>(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('algox_admin_auth') === 'true';
  });

  // Dark / Light Mode — persisted in localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('algox_theme');
    return saved ? saved === 'dark' : true; // default to dark
  });

  // Apply the theme class to <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('light');
    } else {
      root.classList.add('light');
    }
    localStorage.setItem('algox_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (currentCaseId) {
      localStorage.setItem('algox_active_case_id', currentCaseId);
    } else {
      localStorage.removeItem('algox_active_case_id');
    }
  }, [currentCaseId]);

  // Landing page role selection
  const handleRoleSelect = (role: 'user' | 'admin') => {
    setAppView(role);
  };

  // Go back to landing page
  const handleGoHome = () => {
    setAppView('landing');
  };

  const handleLogin = (caseId: string, isNew: boolean) => {
    setCurrentCaseId(caseId);
    setIsNewCase(isNew);
  };

  const handleLogout = () => {
    setCurrentCaseId(null);
    setIsNewCase(false);
    setAppView('landing');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('algox_admin_auth');
    setAdminAuthenticated(false);
    setAppView('landing');
  };

  const handleComplaintSubmitted = (_status: string) => {
    setIsNewCase(false);
  };

  // Whether we're on the landing page (hide tab switcher there)
  const isLanding = appView === 'landing';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        {/* Logo — clicking it goes home */}
        <button
          onClick={isLanding ? undefined : handleGoHome}
          style={{
            background: 'none',
            border: 'none',
            cursor: isLanding ? 'default' : 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Algo<span className="text-blue-400">X</span>
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Safe, anonymous workplace reporting — your identity stays private.
          </p>
        </button>

        {/* Right-side controls */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Mode Toggle — always visible */}
          <button
            id="btn-theme-toggle"
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem' }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {isDark ? 'Light' : 'Dark'}
          </button>

          {/* Tab Switcher — only when NOT on landing */}
          {!isLanding && (
            <div
              style={{
                padding: '0.25rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'var(--card-bg)',
              }}
            >
              <button
                id="tab-user-view"
                onClick={() => setAppView('user')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  appView === 'user'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <User size={14} />
                My Report
              </button>
              <button
                id="tab-admin-view"
                onClick={() => setAppView('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  appView === 'admin'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <UserCog size={14} />
                Admin
              </button>
            </div>
          )}

          {/* Home button — when NOT on landing */}
          {!isLanding && (
            <button
              id="btn-go-home"
              onClick={handleGoHome}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              title="Back to home"
            >
              <Home size={13} />
              Home
            </button>
          )}

          {/* User sign-out */}
          {appView === 'user' && currentCaseId && (
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          )}

          {/* Admin sign-out */}
          {appView === 'admin' && adminAuthenticated && (
            <button
              id="btn-admin-logout"
              onClick={handleAdminLogout}
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
        {/* ── Landing Page ── */}
        {isLanding && <LandingPage onSelectRole={handleRoleSelect} />}

        {/* ── User / My Report flow ── */}
        {appView === 'user' && (
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

        {/* ── Admin flow ── */}
        {appView === 'admin' && (
          adminAuthenticated ? (
            <AdminPortal />
          ) : (
            <AdminLogin onAuthenticated={() => setAdminAuthenticated(true)} />
          )
        )}
      </main>
    </div>
  );
}
