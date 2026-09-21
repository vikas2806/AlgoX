import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, User, UserCog } from 'lucide-react';
import { CaseAuth } from './components/CaseAuth';
import { ComplaintForm } from './components/ComplaintForm';
import { AdminPortal } from './components/AdminPortal';
import { StatusPortal } from './components/StatusPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(() => {
    return localStorage.getItem('algox_active_case_id');
  });
  const [isNewCase, setIsNewCase] = useState<boolean>(false);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen flex flex-col">
      {/* Top Header & Role Switcher */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Algo<span className="text-blue-400">X</span>
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Safe, anonymous workplace reporting — your identity stays private.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              id="tab-user-view"
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <User size={14} />
              My Report
            </button>
            <button
              id="tab-admin-view"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
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
