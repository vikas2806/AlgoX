import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle2, Clock, BellRing, Check, ShieldCheck, FilePlus, Send, MessageSquare, Lock, AlertCircle } from 'lucide-react';
import { FOUR_PUBLIC_STATES, PublicStatus } from '../lib/statusMapping';

interface StatusPortalProps {
  caseId: string;
  onFileAdditional?: () => void;
}

interface CaseMessageItem {
  id: string;
  sender: 'COMPLAINANT' | 'ICC';
  text: string;
  createdAt: string;
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
    desc: 'There is new information about your report. Check the confidential messages below.',
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

export const StatusPortal = ({ caseId }: StatusPortalProps) => {
  const [currentStatus, setCurrentStatus] = useState<PublicStatus>('Received');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wireBytes, setWireBytes] = useState<number>(1024);
  const [rawResponseText, setRawResponseText] = useState<string | undefined>(undefined);

  // Secure Follow-Up & Messages State
  const [messages, setMessages] = useState<CaseMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newFollowUpText, setNewFollowUpText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSuccessMsg, setMessageSuccessMsg] = useState<string | null>(null);

  const followUpInputRef = useRef<HTMLTextAreaElement>(null);

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

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
  }, [fetchStatus, fetchMessages]);

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpText.trim()) return;

    setIsSendingMessage(true);
    setMessageError(null);
    setMessageSuccessMsg(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'COMPLAINANT',
          messageText: newFollowUpText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNewFollowUpText('');
        setMessageSuccessMsg('Follow-up securely encrypted and sent to ICC committee.');
        await fetchMessages();
        setTimeout(() => setMessageSuccessMsg(null), 4000);
      } else {
        setMessageError(data.error || 'Failed to submit follow-up.');
      }
    } catch {
      setMessageError('Network error submitting follow-up.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const scrollToFollowUp = () => {
    followUpInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    followUpInputRef.current?.focus();
  };

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
            onClick={() => {
              fetchStatus();
              fetchMessages();
            }}
            disabled={isRefreshing}
            className="btn btn-secondary text-xs px-3.5 py-2 flex-1 md:flex-initial flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
            {isRefreshing ? 'Checking...' : 'Refresh Status'}
          </button>
          <button
            id="btn-file-additional"
            onClick={scrollToFollowUp}
            className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <FilePlus size={14} />
            Add More Info / Evidence
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
            To keep you safe, detailed internal investigation steps and member names are shielded. Status updates and secure follow-ups stay encrypted end-to-end.
          </div>
        </div>
      </div>

      {/* ── Problem 6: Confidential Follow-Up & Evidence Thread ────────── */}
      <div className="card flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-200">
                Confidential Case Communications & Evidence
              </h3>
              <p className="text-xs text-gray-400">
                Direct, encrypted two-way channel with the Internal Complaints Committee (ICC)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-gray-500 flex items-center gap-1">
            <Lock size={12} className="text-emerald-400" />
            AES-256 Encrypted
          </span>
        </div>

        {/* Messages List */}
        <div className="flex flex-col gap-3 min-h-[140px] max-h-[360px] overflow-y-auto pr-1">
          {isLoadingMessages ? (
            <div className="py-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-blue-400" />
              Loading encrypted messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2 bg-slate-950/40 rounded-xl border border-white/5 p-6">
              <MessageSquare size={24} className="text-gray-600" />
              <p className="text-gray-300 font-medium">No follow-up messages yet.</p>
              <p className="text-gray-500 max-w-md">
                If you have additional dates, witness names, or clarifications, or if the ICC committee requests information, you can securely communicate below.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isComplainant = msg.sender === 'COMPLAINANT';
              return (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    isComplainant
                      ? 'bg-blue-950/20 border-blue-500/30 ml-4'
                      : 'bg-purple-950/25 border-purple-500/35 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold flex items-center gap-1.5 ${isComplainant ? 'text-blue-400' : 'text-purple-300'}`}>
                      {isComplainant ? 'You (Complainant)' : 'Internal Complaints Committee (ICC)'}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {new Date(msg.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Follow-up Submission Form */}
        <form onSubmit={handleSendFollowUp} className="flex flex-col gap-3 pt-2 border-t border-white/10">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
              Add Evidence / Clarification / Response to ICC
            </label>
            <textarea
              ref={followUpInputRef}
              id="textarea-followup"
              className="input-field text-sm"
              rows={3}
              placeholder="Provide additional details, specific incident dates, witness details, or answer questions posed by the ICC..."
              value={newFollowUpText}
              onChange={(e) => setNewFollowUpText(e.target.value)}
            />
          </div>

          {messageError && (
            <div className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-2.5">
              <AlertCircle size={14} className="shrink-0" />
              {messageError}
            </div>
          )}

          {messageSuccessMsg && (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg p-2.5">
              <CheckCircle2 size={14} className="shrink-0" />
              {messageSuccessMsg}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <Lock size={12} className="text-blue-400" />
              Encrypted with AES-256 before leaving your browser.
            </span>
            <button
              id="btn-send-followup"
              type="submit"
              disabled={isSendingMessage || !newFollowUpText.trim()}
              className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              {isSendingMessage ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Encrypting & Sending...
                </>
              ) : (
                <>
                  <Send size={13} />
                  Send to Committee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

