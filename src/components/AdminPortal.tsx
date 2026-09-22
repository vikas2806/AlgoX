import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Clock, FileLock2, ArrowRight, Zap, Shuffle, ListOrdered, Check, UnlockKeyhole, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, FileSearch, MessageSquare, Send } from 'lucide-react';
import { INTERNAL_STATUS_OPTIONS, mapInternalToPublic, PublicStatus } from '../lib/statusMapping';

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
    fetchCasesAndQueue();
    // Poll queue status every 4 seconds
    const interval = setInterval(fetchCasesAndQueue, 4000);
    return () => clearInterval(interval);
  }, [fetchCasesAndQueue]);

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
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'In Review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Update Available':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-badge accent-purple">
            <ShieldAlert size={22} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">HR Admin Dashboard</h2>
            <p className="text-sm text-gray-400">
              Review and manage confidential reports submitted by employees.
            </p>
          </div>
        </div>

        <button
          id="btn-admin-refresh"
          onClick={fetchCasesAndQueue}
          disabled={isLoading}
          className="btn btn-secondary text-sm flex items-center gap-2 self-stretch md:self-auto"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases Table/List */}
        <div className="lg:col-span-7 card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <FileLock2 size={18} className="text-blue-400" />
              All Reports ({cases.length})
            </h3>
            <span className="text-xs text-gray-500">Synced</span>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <Clock size={28} className="text-gray-600" />
              <p>No reports submitted yet.</p>
              <p className="text-xs text-gray-500">Reports from employees will appear here once submitted.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {cases.map((c) => {
                const isSelected = c.caseId === selectedCaseId;
                return (
                  <div
                    key={c.caseId}
                    onClick={() => handleCaseSelect(c)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-950/50'
                        : 'bg-slate-900/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-bold text-blue-300 font-mono">{c.caseId}</code>
                        <span className="text-xs text-gray-500">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span>Stage: <strong className="text-gray-300">{c.internalStatus}</strong></span>
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
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-semibold text-gray-200">
              Update Report Status
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Change the status visible to the reporter
            </p>
          </div>

          {selectedCase ? (
            <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
                <div className="text-xs text-gray-400 uppercase font-semibold">Selected Case</div>
                <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">{selectedCase.caseId}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Current Public Status:{' '}
                  <span className={`font-semibold px-2 py-0.5 rounded-full border text-[11px] ${getPublicStatusBadgeColor(selectedCase.publicStatus)}`}>
                    {selectedCase.publicStatus}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  Investigation Stage
                </label>
                <select
                  id="select-internal-status"
                  className="input-field cursor-pointer text-sm"
                  value={newInternalStatus}
                  onChange={(e) => setNewInternalStatus(e.target.value)}
                >
                  {INTERNAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-gray-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Preview */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold text-gray-400 uppercase">Reporter Will See</div>
                <div className="flex items-center gap-2 text-xs">
                  <ArrowRight size={13} className="text-gray-500" />
                  <span className={`font-semibold px-2.5 py-1 rounded-full border ${getPublicStatusBadgeColor(previewPublicStatus)}`}>
                    {previewPublicStatus}
                  </span>
                </div>
              </div>

              {/* Delayed Release Toggle */}
              <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3 flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-cyan-300">
                  <input
                    type="checkbox"
                    checked={useBatchQueue}
                    onChange={(e) => setUseBatchQueue(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-cyan-500"
                  />
                  <span className="flex items-center gap-1.5">
                    <Shuffle size={14} className="text-cyan-400" />
                    Delay status update for extra privacy
                  </span>
                </label>
                <p className="text-[11px] text-gray-400 leading-normal pl-6">
                  {useBatchQueue
                    ? 'The status update will be released after a short delay to protect privacy.'
                    : 'Status update will apply immediately (for testing only).'}
                </p>
              </div>

              {updateFeedback && (
                <div className={`border rounded-xl p-3 flex items-start gap-2 text-xs ${
                  updateFeedback.isQueued
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <div>{updateFeedback.isQueued ? `Status saved. Will be visible to reporter shortly.` : `Status updated successfully.`}</div>
                    {updateFeedback.delaySec && (
                      <div className="text-[11px] text-gray-400 mt-1">
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
            <div className="py-8 text-center text-gray-400 text-sm">
              Select a report from the list to update its status.
            </div>
          )}
        </div>
      </div>

      {/* Decrypted Report Viewer */}
      {selectedCase && (
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileSearch size={16} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-200">
                  View Report Details
                </h3>
                <p className="text-xs text-gray-400">
                  Report ID:{' '}
                  <code className="text-amber-300 font-mono">{selectedCaseId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {decryptedReport && (
                <button
                  onClick={() => { setDecryptedReport(null); setReportVisible(false); setDecryptError(null); }}
                  className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Lock size={13} className="text-red-400" />
                  Close Report
                </button>
              )}
              <button
                id="btn-decrypt-report"
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.2))', borderColor: 'rgba(245,158,11,0.4)', color: '#fcd34d' }}
              >
                <UnlockKeyhole size={13} />
                {isDecrypting ? 'Opening report...' : 'Open Report'}
              </button>
            </div>
          </div>

          {/* Decrypt Error */}
          {decryptError && (
            <div className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3">
              <AlertCircle size={15} className="shrink-0" />
              {decryptError}
            </div>
          )}

          {/* Decrypted Content */}
          {decryptedReport && reportVisible ? (
            <div className="flex flex-col gap-3">
              {/* Security Badge Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <ShieldCheck size={12} />
                  Securely Verified
                </span>
                <span className="ml-auto text-[11px] text-gray-500">
                  Opened at {new Date(decryptedReport.decryptedAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Incident Category</div>
                  <div className="text-sm font-semibold text-amber-300">{decryptedReport.category}</div>
                </div>
                <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3.5">
                  <div className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Submitted At</div>
                  <div className="text-sm font-mono text-gray-300">
                    {new Date(decryptedReport.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Complaint Text Viewer */}
              <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-semibold text-gray-500 flex items-center gap-1.5">
                    <Eye size={11} />
                    What the employee reported
                  </div>
                  <button
                    onClick={() => setReportVisible(v => !v)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                  >
                    <EyeOff size={11} />
                    Hide
                  </button>
                </div>
                <div
                  className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-sans)', maxHeight: '280px', overflowY: 'auto' }}
                >
                  {decryptedReport.complaintText}
                </div>
              </div>

              {/* Security Warning */}
              <div className="flex items-start gap-2 text-[11px] text-amber-400/70 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  This report is only visible in your browser. Click <strong>"Close Report"</strong> when you're done reviewing it.
                </span>
              </div>
            </div>
          ) : !decryptedReport ? (
            <div className="py-8 text-center flex flex-col items-center gap-2 text-gray-500">
              <Lock size={28} className="text-gray-700" />
              <p className="text-sm">This report is securely stored.</p>
              <p className="text-xs">Click <strong className="text-amber-400">"Open Report"</strong> to read the details.</p>
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2 text-gray-500">
              <EyeOff size={24} className="text-gray-700" />
              <p className="text-xs">Report is hidden. Click <strong className="text-gray-300">"Open Report"</strong> again to view it.</p>
            </div>
          )}

          {/* ── Problem 6: Confidential Follow-Up & Complainant Messages ── */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Case Follow-Ups & Complainant Thread ({caseMessages.length})
                </h4>
              </div>
              <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                <Lock size={11} className="text-emerald-400" />
                End-to-End Encrypted
              </span>
            </div>

            {/* Messages list */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {isLoadingMessages ? (
                <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw size={13} className="animate-spin text-purple-400" />
                  Loading communications...
                </div>
              ) : caseMessages.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500 bg-slate-900/40 rounded-lg p-3">
                  No follow-up messages or inquiries yet for this case.
                </div>
              ) : (
                caseMessages.map((msg) => {
                  const isICC = msg.sender === 'ICC';
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                        isICC
                          ? 'bg-purple-950/20 border-purple-500/30 ml-3'
                          : 'bg-blue-950/25 border-blue-500/30 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isICC ? 'text-purple-300' : 'text-blue-300'}`}>
                          {isICC ? 'ICC Committee' : 'Complainant (Follow-Up)'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ICC Response Form */}
            <form onSubmit={handleSendAdminMessage} className="flex flex-col gap-2 mt-1">
              <textarea
                className="input-field text-xs"
                rows={2}
                placeholder="Ask complainant for dates, witness names, hearing notices, or clarification..."
                value={adminMessageText}
                onChange={(e) => setAdminMessageText(e.target.value)}
              />

              {adminMsgError && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  {adminMsgError}
                </div>
              )}

              {adminMsgSuccess && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 flex items-center gap-1.5">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ListOrdered size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">
                Pending Status Updates
              </h3>
              <p className="text-xs text-gray-400">
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
            <Zap size={13} className="text-amber-400" />
            {isFlushing ? 'Sending...' : 'Send All Now'}
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs">
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
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs font-mono ${
                    item.released
                      ? 'bg-slate-900/40 border-white/5 opacity-70'
                      : 'bg-cyan-950/30 border-cyan-500/40 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <code className="font-bold text-blue-300">{item.caseId}</code>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.released
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPending
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {item.released ? 'SENT' : isPending ? 'PENDING' : 'SENDING'}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-300 flex items-center gap-1">
                    <span>Target:</span>
                    <strong className="text-white">{item.targetStatus}</strong>
                  </div>

                  <div className="text-[10px] text-gray-500 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Scheduled: {new Date(item.scheduledReleaseAt).toLocaleTimeString()}</span>
                    {item.released && <Check size={12} className="text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
