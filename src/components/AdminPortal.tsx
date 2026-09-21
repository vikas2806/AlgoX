import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Clock, FileLock2, ArrowRight, Zap, Shuffle, ListOrdered, Check, UnlockKeyhole, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, FileSearch } from 'lucide-react';
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

  const handleCaseSelect = (c: AdminCase) => {
    setSelectedCaseId(c.caseId);
    setNewInternalStatus(c.internalStatus);
    setUpdateFeedback(null);
    // Clear any previously decrypted report when switching cases
    setDecryptedReport(null);
    setDecryptError(null);
    setReportVisible(false);
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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-100">HR Admin Internal Portal</h2>
              <span className="pillar-tag bg-purple-500/10 text-purple-300 border-purple-500/20">
                Pillar 3 &amp; 4: Batched Release &amp; 4-State Shield
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Manage confidential investigations. Updates are queued and released with random jitter to defeat network timing correlation attacks.
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
          Refresh Registry
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
              Encrypted Case Registry ({cases.length})
            </h3>
            <span className="text-xs text-gray-500 font-mono">SQLite DB Synchronized</span>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
              <Clock size={28} className="text-gray-600" />
              <p>No complaints submitted yet.</p>
              <p className="text-xs text-gray-500">Switch to User Portal to generate a Case ID and file a test report.</p>
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
                        <span>Internal: <strong className="text-gray-300">{c.internalStatus}</strong></span>
                        <span>•</span>
                        <span>Ciphertext: {c.ciphertextSize}B</span>
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
              Update Investigation Status
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Change internal HR state &amp; schedule jittered release
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
                  Internal HR Stage
                </label>
                <select
                  id="select-internal-status"
                  className="input-field cursor-pointer text-sm"
                  value={newInternalStatus}
                  onChange={(e) => setNewInternalStatus(e.target.value)}
                >
                  {INTERNAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-gray-200">
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4-State Mapping Preview */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold text-gray-400 uppercase flex items-center justify-between">
                  <span>Public State Mapping</span>
                  <span className="text-blue-400 font-mono text-[10px]">Strict 4-State Shield</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Internal State</span>
                  <ArrowRight size={13} className="text-gray-500" />
                  <span className={`font-semibold px-2.5 py-1 rounded-full border ${getPublicStatusBadgeColor(previewPublicStatus)}`}>
                    {previewPublicStatus}
                  </span>
                </div>
              </div>

              {/* Task 7: Batch / Jitter Toggle Option */}
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
                    Apply Batched Release with Random Jitter (Pillar 3)
                  </span>
                </label>
                <p className="text-[11px] text-gray-400 leading-normal pl-6">
                  {useBatchQueue
                    ? 'Delays public status release by ~15-25 seconds with random jitter. Defeats observer timing correlation.'
                    : 'Bypasses jitter queue for instant testing.'}
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
                    <div>{updateFeedback.msg}</div>
                    {updateFeedback.delaySec && (
                      <div className="text-[11px] text-gray-400 mt-1 font-mono">
                        Jitter Window: {updateFeedback.delaySec}s (Base 15s + Jitter {updateFeedback.jitterSec}s)
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
                {isUpdating ? 'Scheduling Update...' : 'Commit Status Update'}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              Select a case from the registry to update its status.
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
                  Authorized Incident Report Viewer
                </h3>
                <p className="text-xs text-gray-400">
                  On-demand AES-256-GCM decryption for HR investigation. Case:{' '}
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
                  Lock & Wipe
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
                {isDecrypting ? 'Decrypting...' : 'Decrypt & View Report'}
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
                  AES-256-GCM Verified
                </span>
                <span className="text-[11px] font-mono text-gray-500">
                  Ciphertext was {decryptedReport.ciphertextSize} bytes
                </span>
                <span className="ml-auto text-[11px] text-gray-500 font-mono">
                  Decrypted at {new Date(decryptedReport.decryptedAt).toLocaleTimeString()}
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
                    Incident Description — Decrypted Plaintext
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
                  This decrypted view exists only in browser memory and is not saved anywhere. Use <strong>"Lock & Wipe"</strong> to clear it from the UI when done.
                </span>
              </div>
            </div>
          ) : !decryptedReport ? (
            <div className="py-8 text-center flex flex-col items-center gap-2 text-gray-500">
              <Lock size={28} className="text-gray-700" />
              <p className="text-sm">Report is encrypted at rest.</p>
              <p className="text-xs">Click <strong className="text-amber-400">"Decrypt & View Report"</strong> to authorize on-demand decryption for investigation.</p>
            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2 text-gray-500">
              <EyeOff size={24} className="text-gray-700" />
              <p className="text-xs">Report is hidden. Click <strong className="text-gray-300">"Decrypt & View Report"</strong> again to re-display it.</p>
            </div>
          )}
        </div>
      )}

      {/* Task 7: Batched Release Queue Telemetry & Live Monitor */}
      <div className="card flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ListOrdered size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">
                Metadata Camouflage Batch Release Queue
              </h3>
              <p className="text-xs text-gray-400">
                Background worker polling every 3s to dispatch jittered status updates
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
            {isFlushing ? 'Flushing...' : 'Force Flush Pending Queue'}
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs font-mono">
            Queue is empty. Status updates will appear here when scheduled with jitter.
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
                      {item.released ? 'RELEASED' : isPending ? 'QUEUED (JITTER)' : 'DISPATCHING'}
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
