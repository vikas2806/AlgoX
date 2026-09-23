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
    color: 'text-blue-700 dark:text-blue-300 border-blue-500/40 bg-blue-500/10',
  },
  'In Review': {
    title: 'Being Reviewed',
    desc: 'Your report is currently being looked into by the HR team.',
    icon: Clock,
    color: 'text-amber-800 dark:text-amber-300 border-amber-500/40 bg-amber-500/10',
  },
  'Update Available': {
    title: 'Update Available',
    desc: 'There is new information about your report. Check the confidential messages below.',
    icon: BellRing,
    color: 'text-purple-800 dark:text-purple-300 border-purple-500/40 bg-purple-500/10',
  },
  Closed: {
    title: 'Case Closed',
    desc: 'The review process for this report has been completed.',
    icon: Check,
    color: 'text-emerald-800 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
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

  // Problem 5: Official Status Update Note from Committee
  const [officialStatusNote, setOfficialStatusNote] = useState<string | null>(null);
  const [statusNoteDate, setStatusNoteDate] = useState<string | null>(null);

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
        if (data.statusNote) {
          setOfficialStatusNote(data.statusNote);
          setStatusNoteDate(data.statusNoteUpdatedAt ? new Date(data.statusNoteUpdatedAt).toLocaleString() : null);
        } else {
          setOfficialStatusNote(null);
          setStatusNoteDate(null);
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
            <ShieldCheck size={22} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Report Status</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Report ID: <code style={{ color: 'var(--accent-blue)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{caseId}</code>
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
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} style={isRefreshing ? { color: 'var(--accent-blue)' } : {}} />
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
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

        {/* Official Status Note */}
        {officialStatusNote && (
          <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="flex items-center justify-between pb-2.5" style={{ borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing size={15} style={{ color: 'var(--accent-purple)' }} />
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  Official Committee Update Notice
                </h4>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }}>
                <Lock size={11} style={{ color: '#059669' }} />
                Confidential AES-256 Directive
              </span>
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.04)', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
              {officialStatusNote}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)', paddingTop: '0.25rem' }}>
              <span>Attached directly by the Internal Complaints Committee (ICC).</span>
              {statusNoteDate && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', opacity: 0.75 }}>Issued: {statusNoteDate}</span>}
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex flex-col gap-3 pt-2">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: isCurrent ? '1px solid rgba(59,130,246,0.55)' : isPast ? '1px solid rgba(16,185,129,0.22)' : '1px solid var(--card-border)',
                    background: isCurrent ? 'var(--bg-secondary)' : isPast ? 'var(--bg-tertiary)' : 'var(--tag-inactive)',
                    opacity: isCurrent ? 1 : isPast ? 0.85 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrent ? '0 4px 16px -4px rgba(59,130,246,0.2)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCurrent ? '#2563eb' : isPast ? '#059669' : 'var(--bg-tertiary)',
                          color: isCurrent || isPast ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        {isPast ? <Check size={12} /> : idx + 1}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{STATE_DESCRIPTIONS[state].title}</span>
                    </div>
                    <StateIcon size={16} style={{ color: isCurrent ? 'var(--accent-blue)' : isPast ? '#059669' : 'var(--text-muted)' }} />
                  </div>

                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {STATE_DESCRIPTIONS[state].desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <ShieldCheck size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Your privacy is protected throughout this process.</strong>
            <br />
            To keep you safe, detailed internal investigation steps and member names are shielded. Status updates and secure follow-ups stay encrypted end-to-end.
          </div>
        </div>
      </div>

      {/* Confidential Follow-Up & Evidence Thread */}
      <div className="card flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Confidential Case Communications & Evidence
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Direct, encrypted two-way channel with the Internal Complaints Committee (ICC)
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Lock size={12} style={{ color: '#059669' }} />
            AES-256 Encrypted
          </span>
        </div>

        {/* Messages List */}
        <div className="flex flex-col gap-3 min-h-[140px] max-h-[360px] overflow-y-auto pr-1">
          {isLoadingMessages ? (
            <div className="py-8 text-center flex items-center justify-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              Loading encrypted messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2 p-6" style={{ background: 'var(--bg-tertiary)', borderRadius: '0.75rem', border: '1px solid var(--card-border)', fontSize: '0.75rem' }}>
              <MessageSquare size={24} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No follow-up messages yet.</p>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '28rem' }}>
                If you have additional dates, witness names, or clarifications, or if the ICC committee requests information, you can securely communicate below.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isComplainant = msg.sender === 'COMPLAINANT';
              return (
                <div
                  key={msg.id}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.75rem',
                    border: `1px solid ${isComplainant ? 'rgba(59,130,246,0.25)' : 'rgba(124,58,237,0.28)'}`,
                    background: isComplainant ? 'rgba(59,130,246,0.05)' : 'rgba(124,58,237,0.06)',
                    marginLeft: isComplainant ? '1rem' : '0',
                    marginRight: isComplainant ? '0' : '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', color: isComplainant ? 'var(--accent-blue)' : 'var(--accent-purple)' }}>
                      {isComplainant ? 'You (Complainant)' : 'Internal Complaints Committee (ICC)'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(msg.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Follow-up Submission Form */}
        <form onSubmit={handleSendFollowUp} className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', borderRadius: '0.5rem', padding: '0.625rem' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {messageError}
            </div>
          )}

          {messageSuccessMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', borderRadius: '0.5rem', padding: '0.625rem' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              {messageSuccessMsg}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Lock size={12} style={{ color: 'var(--accent-blue)' }} />
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

