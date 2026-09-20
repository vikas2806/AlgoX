import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Clock, BellRing, Check, ShieldCheck, EyeOff, FilePlus } from 'lucide-react';
import { FOUR_PUBLIC_STATES, PublicStatus } from '../lib/statusMapping';

interface StatusPortalProps {
  caseId: string;
  onFileAdditional: () => void;
}

const STATE_DESCRIPTIONS: Record<PublicStatus, { title: string; desc: string; icon: typeof CheckCircle2; color: string }> = {
  Received: {
    title: 'Report Received',
    desc: 'Your encrypted complaint has been safely committed to the database vault.',
    icon: CheckCircle2,
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  },
  'In Review': {
    title: 'Under Review',
    desc: 'Investigation and assessment are actively underway by authorized personnel.',
    icon: Clock,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  'Update Available': {
    title: 'Update Available',
    desc: 'An investigative milestone, finding, or response is ready for this case.',
    icon: BellRing,
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  Closed: {
    title: 'Case Concluded',
    desc: 'The investigation has been fully completed and final action taken.',
    icon: Check,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
};

export const StatusPortal = ({ caseId, onFileAdditional }: StatusPortalProps) => {
  const [currentStatus, setCurrentStatus] = useState<PublicStatus>('Received');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.publicStatus) {
          setCurrentStatus(data.publicStatus as PublicStatus);
        }
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to fetch status update.');
      }
    } catch {
      setError('Network connection error while checking status.');
    } finally {
      setIsRefreshing(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const activeIndex = FOUR_PUBLIC_STATES.indexOf(currentStatus);
  const currentConfig = STATE_DESCRIPTIONS[currentStatus] || STATE_DESCRIPTIONS['Received'];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="flex flex-col gap-6">
      {/* Case Header Card */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="icon-badge accent-blue">
            <ShieldCheck size={22} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-100">Case Tracking Portal</h2>
              <span className="pillar-tag">Pillar 4: Four-State Portal</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Case Reference: <code className="text-blue-400 font-bold font-mono text-base">{caseId}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto">
          <button
            id="btn-refresh-status"
            onClick={fetchStatus}
            disabled={isRefreshing}
            className="btn btn-secondary text-xs px-3.5 py-2 flex-1 md:flex-initial flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
            {isRefreshing ? 'Checking...' : 'Check Status'}
          </button>
          <button
            id="btn-file-additional"
            onClick={onFileAdditional}
            className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <FilePlus size={14} />
            Add Details
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Main Status Display */}
      <div className="card flex flex-col gap-6">
        {/* Prominent Current Status Banner */}
        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentConfig.color}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center shrink-0">
              <CurrentIcon size={26} />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-80">
                Official Case Status
              </div>
              <div className="text-2xl font-extrabold tracking-tight mt-0.5">
                {currentStatus}
              </div>
              <p className="text-xs opacity-90 mt-1 max-w-xl">
                {currentConfig.desc}
              </p>
            </div>
          </div>

          {lastChecked && (
            <div className="text-right text-xs opacity-75 font-mono">
              Last checked: {lastChecked}
            </div>
          )}
        </div>

        {/* 4-State Stepper / Timeline */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Investigation Lifecycle (Strict 4-State Public Projection)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FOUR_PUBLIC_STATES.map((state, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const StateIcon = STATE_DESCRIPTIONS[state].icon;

              return (
                <div
                  key={state}
                  className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                    isCurrent
                      ? 'bg-slate-900/90 border-blue-500/60 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30'
                      : isPast
                      ? 'bg-slate-950/40 border-emerald-500/20 opacity-85'
                      : 'bg-slate-950/20 border-white/5 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : isPast
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-gray-400'
                        }`}
                      >
                        {isPast ? <Check size={12} /> : idx + 1}
                      </div>
                      <span className="text-sm font-bold text-gray-200">{state}</span>
                    </div>
                    <StateIcon size={16} className={isCurrent ? 'text-blue-400' : isPast ? 'text-emerald-400' : 'text-gray-600'} />
                  </div>

                  <p className="text-[11px] text-gray-400 leading-normal">
                    {STATE_DESCRIPTIONS[state].desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pillar 4 & Privacy Shield Notice */}
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex items-start gap-3 text-xs text-gray-400 leading-relaxed">
          <EyeOff size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-gray-200">Side-Channel Leak Prevention (Pillar 4):</strong>
            <br />
            To protect you from corporate surveillance, intermediate investigation milestones, investigator identities, and internal notes are never transmitted. The user portal only reveals this 4-state indicator.
          </div>
        </div>
      </div>
    </div>
  );
};
