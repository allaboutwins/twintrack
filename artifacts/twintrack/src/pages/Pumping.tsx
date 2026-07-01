import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import Layout, { PageHeader } from "@/components/Layout";
import { Play, Square, Plus, Trash2, Clock, Droplets, Bell, BellOff, ChevronDown, ChevronUp, X } from "lucide-react";
import { enqueue } from "@/lib/offlineQueue";

interface PumpEntry {
  id: number;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  amountMl: number | null;
  side: string | null;
  notes: string | null;
}

interface Summary {
  totalMl: number;
  totalMinutes: number;
  sessionCount: number;
}

interface Reminder {
  intervalHours: number;
  isEnabled: boolean;
  nextReminderAt: string | null;
}

const ML_PRESETS = [30, 60, 90, 120, 150, 180, 210, 240];
const SIDE_OPTIONS = [
  { key: "left",  label: "Left",  emoji: "◀️" },
  { key: "right", label: "Right", emoji: "▶️" },
  { key: "both",  label: "Both",  emoji: "⚡" },
];
const INTERVAL_OPTIONS = [1.5, 2, 2.5, 3, 3.5, 4, 5, 6];

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtElapsed(startedAt: string) {
  const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Pumping() {
  const { user } = useUser();
  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const [entries, setEntries]               = useState<PumpEntry[]>([]);
  const [active, setActive]                 = useState<PumpEntry | null>(null);
  const [summary, setSummary]               = useState<Summary>({ totalMl: 0, totalMinutes: 0, sessionCount: 0 });
  const [reminder, setReminder]             = useState<Reminder>({ intervalHours: 3, isEnabled: false, nextReminderAt: null });
  const [loading, setLoading]               = useState(true);
  const [elapsed, setElapsed]               = useState("");
  const [side, setSide]                     = useState<string>("both");
  const [showManual, setShowManual]         = useState(false);
  const [showReminder, setShowReminder]     = useState(false);
  const [stopSheet, setStopSheet]           = useState(false);
  const [stopAmount, setStopAmount]         = useState<number | null>(null);
  const [stopNotes, setStopNotes]           = useState("");
  const [manualDuration, setManualDuration] = useState(15);
  const [manualAmount, setManualAmount]     = useState<number | null>(null);
  const [manualSide, setManualSide]         = useState<string>("both");
  const [manualTime, setManualTime]         = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/pump?date=${today}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json() as { entries: PumpEntry[]; activeSession: PumpEntry | null; summary: Summary };
        setEntries(d.entries);
        setActive(d.activeSession);
        setSummary(d.summary);
      }
    } finally { setLoading(false); }
  }, [user?.id, baseUrl, today]);

  const loadReminder = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch(`${baseUrl}/api/pump/reminder`, { credentials: "include" });
    if (res.ok) setReminder(await res.json() as Reminder);
  }, [user?.id, baseUrl]);

  useEffect(() => { void load(); void loadReminder(); }, [load, loadReminder]);

  useEffect(() => {
    if (!active) { setElapsed(""); return; }
    const id = setInterval(() => setElapsed(fmtElapsed(active.startedAt)), 1000);
    setElapsed(fmtElapsed(active.startedAt));
    return () => clearInterval(id);
  }, [active]);

  async function startSession() {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/pump/start`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });
      if (res.ok || res.status === 409) {
        await load();
        if (res.status === 409) {
          const d = await res.json() as { activeSession: PumpEntry };
          setActive(d.activeSession);
        }
      }
    } catch {
      if (!navigator.onLine) enqueue({ endpoint: "/api/pump/start", method: "POST", body: { side }, label: "Pump start" });
    } finally { setSaving(false); }
  }

  async function stopSession() {
    if (!active) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (stopAmount != null) body.amountMl = stopAmount;
      if (stopNotes) body.notes = stopNotes;
      const res = await fetch(`${baseUrl}/api/pump/${active.id}/stop`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStopSheet(false);
        setStopAmount(null);
        setStopNotes("");
        await load();
      }
    } finally { setSaving(false); }
  }

  async function logManual() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        startedAt: new Date(manualTime).toISOString(),
        durationMinutes: manualDuration,
        side: manualSide,
      };
      if (manualAmount != null) body.amountMl = manualAmount;
      const res = await fetch(`${baseUrl}/api/pump/manual`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowManual(false);
        setManualAmount(null);
        await load();
      }
    } catch {
      if (!navigator.onLine) enqueue({ endpoint: "/api/pump/manual", method: "POST", body: { startedAt: new Date(manualTime).toISOString(), durationMinutes: manualDuration, side: manualSide, ...(manualAmount != null ? { amountMl: manualAmount } : {}) }, label: "Pump session" });
    } finally { setSaving(false); }
  }

  async function deleteEntry(id: number) {
    const res = await fetch(`${baseUrl}/api/pump/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) await load();
  }

  async function saveReminder(updates: Partial<Reminder>) {
    const next = { ...reminder, ...updates };
    setReminder(next);
    const res = await fetch(`${baseUrl}/api/pump/reminder`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalHours: next.intervalHours, isEnabled: next.isEnabled }),
    });
    if (res.ok) setReminder(await res.json() as Reminder);
  }

  return (
    <Layout>
      <PageHeader
        title="Pumping Hub"
        subtitle="Track every session, measure your supply"
        right={
          <button
            onClick={() => setShowReminder(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-muted"
          >
            {reminder.isEnabled ? <Bell size={14} className="text-primary" /> : <BellOff size={14} />}
            Reminders
          </button>
        }
      />

      <div className="px-4 pb-8 space-y-4">

        {/* Reminder settings panel */}
        {showReminder && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-purple-900">Pump Reminders</p>
              <button onClick={() => setShowReminder(false)} className="p-1 rounded-full hover:bg-purple-100">
                <X size={14} className="text-purple-700" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-purple-800">Enable reminders</p>
              <button
                onClick={() => void saveReminder({ isEnabled: !reminder.isEnabled })}
                className={`w-11 h-6 rounded-full transition-colors ${reminder.isEnabled ? "bg-purple-600" : "bg-muted"} relative`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${reminder.isEnabled ? "left-6" : "left-1"}`} />
              </button>
            </div>
            {reminder.isEnabled && (
              <div>
                <p className="text-xs text-purple-700 mb-2">Remind me every</p>
                <div className="flex gap-1.5 flex-wrap">
                  {INTERVAL_OPTIONS.map(h => (
                    <button
                      key={h}
                      onClick={() => void saveReminder({ intervalHours: h })}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${reminder.intervalHours === h ? "bg-purple-600 text-white" : "bg-white text-purple-700 border border-purple-200"}`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active session card */}
        {active ? (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Session Active</p>
                <p className="text-4xl font-bold text-purple-900 tabular-nums mt-1">{elapsed || "00:00"}</p>
                <p className="text-xs text-purple-600 mt-0.5">Started {fmtTime(active.startedAt)}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center animate-pulse">
                <span className="text-2xl">🫙</span>
              </div>
            </div>
            <button
              onClick={() => setStopSheet(true)}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Square size={16} fill="currentColor" />
              Stop Session
            </button>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Pumping</p>
            <div className="flex gap-2">
              {SIDE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSide(opt.key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${side === opt.key ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-muted/40 text-muted-foreground border-border"}`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => void startSession()}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Play size={16} fill="currentColor" />
              Start Session
            </button>
          </div>
        )}

        {/* Today summary pills */}
        {(summary.sessionCount > 0 || !loading) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-purple-700">{summary.sessionCount}</p>
              <p className="text-[10px] text-purple-500 font-medium">Sessions</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-purple-700">
                {summary.totalMinutes > 0 ? fmtDuration(summary.totalMinutes) : "—"}
              </p>
              <p className="text-[10px] text-purple-500 font-medium">Total time</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-purple-700">
                {summary.totalMl > 0 ? `${summary.totalMl}ml` : "—"}
              </p>
              <p className="text-[10px] text-purple-500 font-medium">Total output</p>
            </div>
          </div>
        )}

        {/* Manual entry toggle */}
        <button
          onClick={() => setShowManual(v => !v)}
          className="w-full flex items-center justify-between bg-white border border-border rounded-2xl px-4 py-3 text-sm font-medium text-foreground"
        >
          <span className="flex items-center gap-2"><Plus size={15} className="text-purple-600" /> Log manually</span>
          {showManual ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </button>

        {showManual && (
          <div className="bg-white border border-border rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Time</p>
              <input
                type="datetime-local"
                value={manualTime}
                onChange={e => setManualTime(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Duration</p>
              <div className="flex gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 25, 30, 40, 45, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => setManualDuration(m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${manualDuration === m ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Side</p>
              <div className="flex gap-2">
                {SIDE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setManualSide(opt.key)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${manualSide === opt.key ? "bg-purple-600 text-white border-purple-600" : "bg-muted/40 text-muted-foreground border-border"}`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Output (optional)</p>
              <div className="flex gap-1.5 flex-wrap">
                {ML_PRESETS.map(ml => (
                  <button
                    key={ml}
                    onClick={() => setManualAmount(manualAmount === ml ? null : ml)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${manualAmount === ml ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {ml}ml
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => void logManual()}
              disabled={saving}
              className="w-full py-2.5 rounded-2xl bg-purple-600 text-white font-semibold text-sm disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              Save Entry
            </button>
          </div>
        )}

        {/* Session list */}
        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Sessions</p>
            {entries.map(entry => (
              <div key={entry.id} className="bg-white border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-lg">🫙</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{fmtTime(entry.startedAt)}</p>
                    {entry.side && (
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-700 rounded-full px-1.5 py-0.5">
                        {entry.side}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.durationMinutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{fmtDuration(entry.durationMinutes)}</span>
                    )}
                    {entry.amountMl && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Droplets size={10} />{entry.amountMl}ml</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void deleteEntry(entry.id)}
                  className="p-2 rounded-xl hover:bg-rose-50 hover:text-rose-500 text-muted-foreground transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 space-y-2">
            <p className="text-3xl">🫙</p>
            <p className="text-sm font-medium text-foreground">No sessions today</p>
            <p className="text-xs text-muted-foreground">Start or log a session above</p>
          </div>
        )}
      </div>

      {/* Stop session sheet */}
      {stopSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setStopSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full bg-white rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">Stop Session</p>
              <button onClick={() => setStopSheet(false)} className="p-1 rounded-full hover:bg-muted"><X size={18} /></button>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Output (optional)</p>
              <div className="flex gap-1.5 flex-wrap">
                {ML_PRESETS.map(ml => (
                  <button
                    key={ml}
                    onClick={() => setStopAmount(stopAmount === ml ? null : ml)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${stopAmount === ml ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {ml}ml
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes (optional)</p>
              <input
                value={stopNotes}
                onChange={e => setStopNotes(e.target.value)}
                placeholder="Any notes..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void stopSession()}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-purple-600 text-white font-bold text-sm disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {saving ? "Saving..." : "Stop & Save"}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
