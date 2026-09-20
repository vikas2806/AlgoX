import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Clock, FileLock2, ArrowRight } from 'lucide-react';
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

export const AdminPortal = () => {
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [newInternalStatus, setNewInternalStatus] = useState<string>('ASSIGNED_INVESTIGATOR');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        if (data.cases && data.cases.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data.cases[0].caseId);
          setNewInternalStatus(data.cases[0].internalStatus);
        }
      } else {
        setError('Failed to load cases from server.');
      }
    } catch {
      setError('Network error loading cases.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleCaseSelect = (c: AdminCase) => {
    setSelectedCaseId(c.caseId);
    setNewInternalStatus(c.internalStatus);
    setUpdateSuccess(null);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(null);

    try {
      const res = await fetch('/api/admin/cases/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCaseId,
          internalStatus: newInternalStatus,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUpdateSuccess(`Case ${data.caseId} updated -> Public Status: ${data.publicStatus}`);
        fetchCases();
      } else {
        setError(data.error || 'Failed to update case status.');
      }
    } catch {
      setError('Network error updating status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedCase = cases.find((c) => c.caseId === selectedCaseId);
  const previewPublicStatus = mapInternalToPublic(newInternalStatus);

  const getPublicStatusBadgeColor = (status: PublicStatus) => {
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
                Pillar 4: Four-State Mapping
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Manage confidential workplace investigations. Internal workflow is strictly abstracted to 4 public states.
            </p>
          </div>
        </div>

        <button
          id="btn-admin-refresh"
          onClick={fetchCases}
          disabled={isLoading}
          className="btn btn-secondary text-sm flex items-center gap-2 self-stretch md:self-auto"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Refresh Cases
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
              Change internal HR state &amp; map to public victim state
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
                <p className="text-[11px] text-gray-500 leading-normal">
                  The user portal will only ever display this 4-state label, preventing metadata leakage about internal investigative complexity.
                </p>
              </div>

              {updateSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>{updateSuccess}</span>
                </div>
              )}

              <button
                id="btn-admin-save-status"
                type="submit"
                disabled={isUpdating}
                className="btn btn-primary w-full mt-1"
              >
                {isUpdating ? 'Applying Status Update...' : 'Commit Status Update'}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              Select a case from the registry to update its status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
