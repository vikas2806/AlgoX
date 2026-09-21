import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Clock, BellRing, Check, ShieldCheck, FilePlus } from 'lucide-react';
import { FOUR_PUBLIC_STATES, PublicStatus } from '../lib/statusMapping';

interface StatusPortalProps {
  caseId: string;
  onFileAdditional: () => void;
}

const STATE_DESCRIPTIONS: Record<PublicStatus, { title: string; desc: string; icon: typeof CheckCircle2; color: string }> = {
  Received: {
    title: 'Report Received',
    desc: 'We have your report. It has been saved securely.',
    icon: CheckCircle2,
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  },
  'In Review': {
    title: 'Being Reviewed',
    desc: 'Your report is currently being looked into by the HR team.',
    icon: Clock,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  'Update Available': {
    title: 'Update Available',
    desc: 'There is new information about your report. Check back soon.',
    icon: BellRing,
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  Closed: {
    title: 'Case Closed',
    desc: 'The review process for this report has been completed.',
    icon: Check,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
};

export const StatusPortal = ({ caseId, onFileAdditional }: StatusPortalProps) => {
  const [currentStatus, setCurrentStatus] = useState<PublicStatus>('Received');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wireBytes, setWireBytes] = useState<number>(1024);
  const [rawResponseText, setRawResponseText] = useState<string | undefined>(undefined);

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/status`);
      const rawText = await res.text();
      setRawResponseText(rawText);

      // Check header or raw text byte length
      const contentLengthHeader = res.headers.get('Content-Length');
      const calculatedBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : new Blob([rawText]).size;
      setWireBytes(calculatedBytes || 1024);

      if (res.ok) {
        const data = JSON.parse(rawText);
        if (data.publicStatus) {
          setCurrentStatus(data.publicStatus as PublicStatus);
        }
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        const err = JSON.parse(rawText);
        setError(err.error || 'Could not fetch the latest status.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // suppress unused variable warning while keeping the variables for potential future use
  void wireBytes;
  void rawResponseText;

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
            <h2 className="text-xl font-bold text-gray-100">My Report Status</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Report ID: <code className="text-blue-400 font-bold font-mono text-base">{caseId}</code>
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
            {isRefreshing ? 'Checking...' : 'Refresh Status'}
          </button>
          <button
            id="btn-file-additional"
            onClick={onFileAdditional}
            className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <FilePlus size={14} />
            Add More Info
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
                Current Status
              </div>
              <div className="text-2xl font-extrabold tracking-tight mt-0.5">
                {currentConfig.title}
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

        {/* Progress Steps */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Progress
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
                      <span className="text-sm font-bold text-gray-200">{STATE_DESCRIPTIONS[state].title}</span>
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

        {/* Privacy note */}
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex items-start gap-3 text-xs text-gray-400 leading-relaxed">
          <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-gray-200">Your privacy is protected throughout this process.</strong>
            <br />
            To keep you safe, detailed investigation notes and the identities of those involved are never shown here. Only the overall progress of your report is displayed.
          </div>
        </div>
      </div>
    </div>
  );
};
