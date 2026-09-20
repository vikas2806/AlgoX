import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, EyeOff, FileText, CheckCircle2, User, UserCog } from 'lucide-react';
import { CaseAuth } from './components/CaseAuth';
import { ComplaintForm } from './components/ComplaintForm';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
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
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen flex flex-col">
      {/* Top Header & Role Switcher */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Algo<span className="text-blue-500">X</span>
            </h1>
            <span className="text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
              MVP
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Metadata-camouflaged workplace harassment reporting &amp; status tracking
          </p>
        </div>

        {/* Global Nav Switcher: User View vs Admin Portal */}
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
              Victim / User Portal
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
              HR Admin Portal
            </button>
          </div>

          {activeTab === 'user' && currentCaseId && (
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Exit ({currentCaseId})
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
              <div className="card flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="icon-badge accent-emerald">
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-100">Case Active in System</h2>
                      <p className="text-xs text-gray-400">
                        Authenticated anonymously as <code className="text-blue-400 font-bold">{currentCaseId}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsNewCase(true)}
                      className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      File Additional Report
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-blue-300 font-medium">
                    <EyeOff size={16} />
                    <span>Four-State Public Status:</span>
                    <span className="text-emerald-400 font-bold px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs">
                      {caseStatus || 'Received'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Your complaint ciphertext is stored in the database. In the next tasks (Task 5, 6, &amp; 7), we build the full four-state user status portal, response padding, and batched/jittered releases.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
