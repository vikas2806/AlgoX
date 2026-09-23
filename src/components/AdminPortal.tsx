import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Clock, FileLock2, ArrowRight, Zap, Shuffle, ListOrdered, Check, UnlockKeyhole, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, FileSearch, MessageSquare, Send, LogOut, Loader2 } from 'lucide-react';
import { INTERNAL_STATUS_OPTIONS, mapInternalToPublic, PublicStatus } from '../lib/statusMapping';
import { AdminLogin, AdminUser } from './AdminLogin';
import { AccountManagement } from './AccountManagement';

interface AdminCase {
  id: string;
  caseId: string;
  internalStatus: string;
  publicStatus: PublicStatus;
  createdAt: string;
  updatedAt: string;
  ciphertextSize: number;
}

interface QueueItem {
  id: string;
  caseId: string;
  targetStatus: string;
  scheduledReleaseAt: string;
  released: boolean;
  createdAt: string;
}

interface DecryptedReport {
  caseId: string;
  category: string;
  complaintText: string;
  submittedAt: string;
  decryptedAt: string;
  ciphertextSize: number;
  internalStatus: string;
}

interface CaseMessageItem {
  id: string;
  sender: 'COMPLAINANT' | 'ICC';
  text: string;
  createdAt: string;
}

export const AdminPortal = () => {
  // Auth state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'accounts'>('cases');

  const [cases, setCases] = useState<AdminCase[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [newInternalStatus, setNewInternalStatus] = useState<string>('ASSIGNED_INVESTIGATOR');
  const [useBatchQueue, setUseBatchQueue] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{
    msg: string;
    isQueued: boolean;
    delaySec?: number;
    jitterSec?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decryptedReport, setDecryptedReport] = useState<DecryptedReport | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  // ICC Follow-Up & Complainant Messages
  const [caseMessages, setCaseMessages] = useState<CaseMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [adminMessageText, setAdminMessageText] = useState('');
  const [isSendingAdminMsg, setIsSendingAdminMsg] = useState(false);
  const [adminMsgError, setAdminMsgError] = useState<string | null>(null);
  const [adminMsgSuccess, setAdminMsgSuccess] = useState<string | null>(null);

  // Problem 5: Official Status Update Note for Complainant
  const [statusNoteText, setStatusNoteText] = useState('');

  // Check auth status on mount
  useEffect(() => {
    const checkSession = async () => {
      setCheckingAuth(true);
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.admin) {
            setAdminUser(data.admin);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAdminUser(null);
      setCases([]);
      setQueue([]);
    }
  };

  const fetchCasesAndQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [casesRes, queueRes] = await Promise.all([
        fetch('/api/admin/cases'),
        fetch('/api/admin/queue'),
      ]);

      if (casesRes.ok) {
        const data = await casesRes.json();
        setCases(data.cases || []);
        if (data.cases && data.cases.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data.cases[0].caseId);
          setNewInternalStatus(data.cases[0].internalStatus);
        }
      }

      if (queueRes.ok) {
        const qData = await queueRes.json();
        setQueue(qData.queue || []);
      }
    } catch {
      setError('Network error loading cases & queue.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (!adminUser) return;
    fetchCasesAndQueue();
    // Poll queue status every 4 seconds
    const interval = setInterval(fetchCasesAndQueue, 4000);
    return () => clearInterval(interval);
  }, [adminUser, fetchCasesAndQueue]);

  const fetchCaseMessages = useCallback(async (caseId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setCaseMessages(data.messages || []);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleCaseSelect = (c: AdminCase) => {
    setSelectedCaseId(c.caseId);
    setNewInternalStatus(c.internalStatus);
    setUpdateFeedback(null);
    // Clear any previously decrypted report when switching cases
    setDecryptedReport(null);
    setDecryptError(null);
    setReportVisible(false);
    setStatusNoteText('');
    fetchCaseMessages(c.caseId);
  };

  const handleDecrypt = async () => {
    if (!selectedCaseId) return;
    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptedReport(null);
    setReportVisible(false);
    try {
      const res = await fetch('/api/admin/cases/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDecryptedReport(data as DecryptedReport);
        setReportVisible(true);
      } else {
        setDecryptError(data.error || 'Decryption failed.');
      }
    } catch {
      setDecryptError('Network error during decryption.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setIsUpdating(true);
    setError(null);
    setUpdateFeedback(null);

    try {
      const res = await fetch('/api/admin/cases/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          internalStatus: newInternalStatus,
          immediate: !useBatchQueue,
          statusNote: statusNoteText.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusNoteText('');
        if (data.batchedRelease && !data.batchedRelease.releasedNow) {
          setUpdateFeedback({
            msg: `Case ${data.caseId} updated internally. Public release queued with metadata jitter.`,
            isQueued: true,
            delaySec: data.batchedRelease.delaySeconds,
            jitterSec: data.batchedRelease.jitterSeconds,
          });
        } else {
          setUpdateFeedback({
            msg: `Case ${data.caseId} updated immediately -> Public Status: ${data.targetPublicStatus}`,
            isQueued: false,
          });
        }
        fetchCasesAndQueue();
      } else {
        setError(data.error || 'Failed to update case status.');
      }
    } catch {
      setError('Network error updating status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !adminMessageText.trim()) return;

    setIsSendingAdminMsg(true);
    setAdminMsgError(null);
    setAdminMsgSuccess(null);

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'ICC',
          messageText: adminMessageText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminMessageText('');
        setAdminMsgSuccess('Inquiry/response securely encrypted and sent to complainant.');
        await fetchCaseMessages(selectedCaseId);
        setTimeout(() => setAdminMsgSuccess(null), 4000);
      } else {
        setAdminMsgError(data.error || 'Failed to send inquiry.');
      }
    } catch {
      setAdminMsgError('Network error sending inquiry.');
    } finally {
      setIsSendingAdminMsg(false);
    }
  };

  const handleFlushQueue = async () => {
    setIsFlushing(true);
    try {
      const res = await fetch('/api/admin/queue/flush', { method: 'POST' });
      if (res.ok) {
        await fetchCasesAndQueue();
      }
    } catch {
      setError('Failed to flush queue.');
    } finally {
      setIsFlushing(false);
    }
  };

  const selectedCase = cases.find((c) => c.caseId === selectedCaseId);
  const previewPublicStatus = mapInternalToPublic(newInternalStatus);

  const getPublicStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold';
      case 'In Review':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold';
      case 'Update Available':
        return 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30 font-bold';
      case 'Closed':
        return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-bold';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30 font-bold';
    }
  };

  if (checkingAuth) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
        <p className="text-sm font-medium">Verifying committee credentials...</p>
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-badge accent-purple">
            <ShieldAlert size={22} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>ICC Committee Portal</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                adminUser.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}>
                {adminUser.role}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Signed in as <span className="text-slate-200 font-medium">{adminUser.name}</span> ({adminUser.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          {adminUser.role === 'ADMIN' && (
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'cases' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Case Review
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'accounts' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Committee Accounts
              </button>
            </div>
          )}

          {activeTab === 'cases' && (
            <button
              id="btn-admin-refresh"
              onClick={fetchCasesAndQueue}
              disabled={isLoading}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}

          <button
            onClick={handleLogout}
            className="btn text-sm flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {activeTab === 'accounts' ? (
        <AccountManagement currentUser={adminUser} />
      ) : (
        <>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases Table/List */}
        <div className="lg:col-span-7 card flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileLock2 size={18} style={{ color: 'var(--accent-blue)' }} />
              All Reports ({cases.length})
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Synced</span>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={28} style={{ color: 'var(--text-muted)' }} />
              <p>No reports submitted yet.</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reports from employees will appear here once submitted.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {cases.map((c) => {
                const isSelected = c.caseId === selectedCaseId;
                return (
                  <div
                    key={c.caseId}
                    onClick={() => handleCaseSelect(c)}
                    style={{
                      padding: '0.875rem',
                      borderRadius: '0.75rem',
                      border: isSelected ? '1px solid rgba(59,130,246,0.5)' : '1px solid var(--card-border)',
                      background: isSelected ? 'rgba(59,130,246,0.07)' : 'var(--tag-inactive)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <code style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{c.caseId}</code>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <span>Stage: <strong style={{ color: 'var(--text-primary)' }}>{c.internalStatus}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPublicStatusBadgeColor(c.publicStatus)}`}>
                        {c.publicStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Case Status Manager Panel */}
        <div className="lg:col-span-5 card flex flex-col gap-4">
          <div className="pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Update Report Status
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Change the status visible to the reporter
            </p>
          </div>

          {selectedCase ? (
            <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4">
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Selected Case</div>
                <div style={{ fontSize: '1.125rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '0.125rem' }}>{selectedCase.caseId}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Current Public Status:{' '}
                  <span className={`font-semibold px-2 py-0.5 rounded-full border text-[11px] ${getPublicStatusBadgeColor(selectedCase.publicStatus)}`}>
                    {selectedCase.publicStatus}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                  Investigation Stage
                </label>
                <select
                  id="select-internal-status"
                  className="input-field cursor-pointer text-sm"
                  value={newInternalStatus}
                  onChange={(e) => setNewInternalStatus(e.target.value)}
                >
                  {INTERNAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Preview */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reporter Will See</div>
                <div className="flex items-center gap-2 text-xs">
                  <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                  <span className={`font-semibold px-2.5 py-1 rounded-full border ${getPublicStatusBadgeColor(previewPublicStatus)}`}>
                    {previewPublicStatus}
                  </span>
                </div>
              </div>

              {/* Official Status Note */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Lock size={12} style={{ color: 'var(--accent-purple)' }} />
                    Official Status Note / Directive
                  </label>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AES-256 Encrypted</span>
                </div>
                <textarea
                  id="textarea-status-note"
                  className="input-field text-xs"
                  rows={3}
                  placeholder={
                    previewPublicStatus === 'Update Available'
                      ? 'e.g. "Preliminary hearings concluded. Confidential proceeding scheduled for Friday at 2:00 PM in Room C. Please confirm attendance..."'
                      : 'Optional: Attach a confidential official status note visible to the reporter once released...'
                  }
                  value={statusNoteText}
                  onChange={(e) => setStatusNoteText(e.target.value)}
                />
                {previewPublicStatus === 'Update Available' && !statusNoteText && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    💡 Recommended: Attach an official notice so the complainant understands what update is available.
                  </p>
                )}
              </div>

              {/* Delayed Release Toggle */}
              <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#0891b2' }}>
                  <input
                    type="checkbox"
                    checked={useBatchQueue}
                    onChange={(e) => setUseBatchQueue(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="flex items-center gap-1.5">
                    <Shuffle size={14} style={{ color: '#06b6d4' }} />
                    Delay status update for extra privacy
                  </span>
                </label>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: '1.5', paddingLeft: '1.5rem' }}>
                  {useBatchQueue
                    ? 'The status update will be released after a short delay to protect privacy.'
                    : 'Status update will apply immediately (for testing only).'}
                </p>
              </div>

              {updateFeedback && (
                <div style={{
                  border: `1px solid ${updateFeedback.isQueued ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: updateFeedback.isQueued ? '#0891b2' : '#059669',
                  background: updateFeedback.isQueued ? 'rgba(6,182,212,0.06)' : 'rgba(16,185,129,0.06)',
                }}>
                  <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <div>
                    <div>{updateFeedback.isQueued ? `Status saved. Will be visible to reporter shortly.` : `Status updated successfully.`}</div>
                    {updateFeedback.delaySec && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Estimated delay: ~{updateFeedback.delaySec} seconds
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                id="btn-admin-save-status"
                type="submit"
                disabled={isUpdating}
                className="btn btn-primary w-full mt-1"
              >
                {isUpdating ? 'Saving...' : 'Save Status'}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Select a report from the list to update its status.
            </div>
          )}
        </div>
      </div>

      {/* Decrypted Report Viewer */}
      {selectedCase && (
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            <div className="flex items-center gap-2.5">
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <FileSearch size={16} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  View Report Details
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Report ID:{' '}
                  <code style={{ color: '#d97706', fontFamily: 'var(--font-mono)' }}>{selectedCaseId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {decryptedReport && (
                <button
                  onClick={() => { setDecryptedReport(null); setReportVisible(false); setDecryptError(null); }}
                  className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Lock size={13} style={{ color: '#dc2626' }} />
                  Close Report
                </button>
              )}
              <button
                id="btn-decrypt-report"
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.2))', borderColor: 'rgba(245,158,11,0.4)', color: '#d97706' }}
              >
                <UnlockKeyhole size={13} />
                {isDecrypting ? 'Opening report...' : 'Open Report'}
              </button>
            </div>
          </div>

          {decryptError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', borderRadius: '0.75rem', padding: '0.75rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {decryptError}
            </div>
          )}

          {decryptedReport && reportVisible ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669' }}>
                  <ShieldCheck size={12} />
                  Securely Verified
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Opened at {new Date(decryptedReport.decryptedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Incident Category</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d97706' }}>{decryptedReport.category}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Submitted At</div>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {new Date(decryptedReport.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="flex items-center justify-between">
                  <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Eye size={11} />
                    What the employee reported
                  </div>
                  <button
                    onClick={() => setReportVisible(v => !v)}
                    style={{ fontSize: '0.625rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <EyeOff size={11} />
                    Hide
                  </button>
                </div>
                <div
                  style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', maxHeight: '280px', overflowY: 'auto' }}
                >
                  {decryptedReport.complaintText}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.6875rem', color: 'rgba(217,119,6,0.8)', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                <span>
                  This report is only visible in your browser. Click <strong>"Close Report"</strong> when you're done reviewing it.
                </span>
              </div>
            </div>
          ) : !decryptedReport ? (
            <div className="py-8 text-center flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Lock size={28} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm">This report is securely stored.</p>
              <p className="text-xs">Click <strong style={{ color: '#d97706' }}>"Open Report"</strong> to read the details.</p>
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <EyeOff size={24} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs">Report is hidden. Click <strong style={{ color: 'var(--text-secondary)' }}>"Open Report"</strong> again to view it.</p>
            </div>
          )}

          {/* Follow-Up & Complainant Messages */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: 'var(--accent-purple)' }} />
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  Case Follow-Ups & Complainant Thread ({caseMessages.length})
                </h4>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Lock size={11} style={{ color: '#059669' }} />
                End-to-End Encrypted
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {isLoadingMessages ? (
                <div className="py-4 text-center flex items-center justify-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={13} className="animate-spin" style={{ color: 'var(--accent-purple)' }} />
                  Loading communications...
                </div>
              ) : caseMessages.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--tag-inactive)', borderRadius: '0.5rem' }}>
                  No follow-up messages or inquiries yet for this case.
                </div>
              ) : (
                caseMessages.map((msg) => {
                  const isICC = msg.sender === 'ICC';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        padding: '0.625rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${isICC ? 'rgba(124,58,237,0.25)' : 'rgba(59,130,246,0.25)'}`,
                        background: isICC ? 'rgba(124,58,237,0.06)' : 'rgba(59,130,246,0.06)',
                        marginLeft: isICC ? '0.75rem' : '0',
                        marginRight: isICC ? '0' : '0.75rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ fontWeight: 600, color: isICC ? 'var(--accent-purple)' : 'var(--accent-blue)' }}>
                          {isICC ? 'ICC Committee' : 'Complainant (Follow-Up)'}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendAdminMessage} className="flex flex-col gap-2 mt-1">
              <textarea
                className="input-field text-xs"
                rows={2}
                placeholder="Ask complainant for dates, witness names, hearing notices, or clarification..."
                value={adminMessageText}
                onChange={(e) => setAdminMessageText(e.target.value)}
              />

              {adminMsgError && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '0.25rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertCircle size={13} />
                  {adminMsgError}
                </div>
              )}

              {adminMsgSuccess && (
                <div style={{ fontSize: '0.75rem', color: '#059669', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.25rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <CheckCircle size={13} />
                  {adminMsgSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingAdminMsg || !adminMessageText.trim()}
                  className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {isSendingAdminMsg ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Post Confidential Inquiry to Complainant
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Updates Queue */}
      <div className="card flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
              <ListOrdered size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pending Status Updates
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Updates waiting to be sent to reporters
              </p>
            </div>
          </div>

          <button
            id="btn-flush-queue"
            onClick={handleFlushQueue}
            disabled={isFlushing || queue.filter((q) => !q.released).length === 0}
            className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Zap size={13} style={{ color: 'var(--accent-amber)' }} />
            {isFlushing ? 'Sending...' : 'Send All Now'}
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            No pending updates. All reporters are up to date.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => {
              const isPast = new Date(item.scheduledReleaseAt) <= new Date();
              const isPending = !item.released && !isPast;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: item.released ? '1px solid var(--card-border)' : '1px solid rgba(6,182,212,0.35)',
                    background: item.released ? 'var(--tag-inactive)' : 'rgba(6,182,212,0.05)',
                    opacity: item.released ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <code style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{item.caseId}</code>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.released
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : isPending
                          ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 animate-pulse'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }`}
                    >
                      {item.released ? 'SENT' : isPending ? 'PENDING' : 'SENDING'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Target:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.targetStatus}</strong>
                  </div>

                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid var(--divider)' }}>
                    <span>Scheduled: {new Date(item.scheduledReleaseAt).toLocaleTimeString()}</span>
                    {item.released && <Check size={12} style={{ color: '#059669' }} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
