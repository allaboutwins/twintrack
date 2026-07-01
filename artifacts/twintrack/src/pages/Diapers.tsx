import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useListTwins,
  useListDiaperEntries,
  useCreateDiaperEntry,
  useUpdateDiaperEntry,
  useDeleteDiaperEntry,
  getListDiaperEntriesQueryKey,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { TwinTabs, PageHeader } from "@/components/Layout";
import { Trash2, Pencil, X, Check, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { enqueue } from "@/lib/offlineQueue";

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

type DiaperType = "wet" | "dirty" | "mixed";

const DIAPER_TYPES: { key: DiaperType; label: string; emoji: string; color: string }[] = [
  { key: "wet", label: "Wet", emoji: "💧", color: "#83b8c0" },
  { key: "dirty", label: "Dirty", emoji: "💩", color: "#b58c5a" },
  { key: "mixed", label: "Mixed", emoji: "🔄", color: "#2e818c" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m ago` : `${hours}h ago`;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type DiaperEntry = {
  id: number;
  type: string;
  time: string;
  notes?: string | null;
};

function EditDiaperSheet({
  entry,
  onClose,
  onSave,
}: {
  entry: DiaperEntry;
  onClose: () => void;
  onSave: (updates: { type: string; time: string; notes: string | null }) => void;
}) {
  const [diaperType, setDiaperType] = useState<DiaperType>(entry.type as DiaperType);
  const [timeVal, setTimeVal] = useState(toDatetimeLocal(entry.time));
  const [notes, setNotes] = useState(entry.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 safe-area-pb">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Edit Diaper Entry</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Type</p>
          <div className="grid grid-cols-3 gap-2">
            {DIAPER_TYPES.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setDiaperType(key)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                  diaperType === key ? "text-white shadow-sm" : "bg-muted text-muted-foreground"
                }`}
                style={diaperType === key ? { backgroundColor: DIAPER_TYPES.find(d => d.key === key)?.color } : {}}
              >
                <span className="block text-lg mb-0.5">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Time</p>
          <input
            type="datetime-local"
            value={timeVal}
            onChange={(e) => setTimeVal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. unusual color, small amount…"
            rows={2}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ type: diaperType, time: new Date(timeVal).toISOString(), notes: notes.trim() || null })}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check size={15} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Diapers() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA");
  const [justLogged, setJustLogged] = useState<DiaperType | null>(null);
  const [editingEntry, setEditingEntry] = useState<DiaperEntry | null>(null);
  const [movedToTwin, setMovedToTwin] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const [activeTwinId, setActiveTwinId] = useState<number | null>(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("twinId");
      return id ? parseInt(id, 10) : null;
    } catch { return null; }
  });
  const twinId = activeTwinId ?? twins[0]?.id ?? null;

  useEffect(() => {
    if (twins.length > 0 && activeTwinId === null) setActiveTwinId(twins[0].id);
  }, [twins, activeTwinId]);

  const diaperParams = { twinId: twinId ?? 0, date: today, timezone: TZ };

  const { data: entries = [], isLoading } = useListDiaperEntries(
    diaperParams,
    { query: { enabled: !!twinId, queryKey: getListDiaperEntriesQueryKey(diaperParams) } },
  );

  const createEntry = useCreateDiaperEntry();
  const updateEntry = useUpdateDiaperEntry();
  const deleteEntry = useDeleteDiaperEntry();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListDiaperEntriesQueryKey(diaperParams) });
  }

  function logDiaper(type: DiaperType) {
    if (!twinId) return;
    setJustLogged(type);
    setTimeout(() => setJustLogged(null), 1200);
    const time = new Date().toISOString();
    createEntry.mutate(
      { data: { twinId, type, time } },
      {
        onSuccess: invalidate,
        onError: () => {
          if (!navigator.onLine) enqueue({ endpoint: "/api/diapers", method: "POST", body: { twinId, type, time }, label: "Diaper log" });
        },
      },
    );
  }

  function saveEdit(updates: { type: string; time: string; notes: string | null }) {
    if (!editingEntry) return;
    updateEntry.mutate(
      { id: editingEntry.id, data: updates },
      {
        onSuccess: () => {
          invalidate();
          setEditingEntry(null);
        },
      },
    );
  }

  function moveToOtherTwin(entryId: number) {
    const otherTwin = twins.find((t) => t.id !== twinId);
    if (!otherTwin) return;
    updateEntry.mutate(
      { id: entryId, data: { twinId: otherTwin.id } },
      {
        onSuccess: () => {
          invalidate();
          qc.invalidateQueries({ queryKey: getListDiaperEntriesQueryKey({ twinId: otherTwin.id, date: today, timezone: TZ }) });
          const name = otherTwin.name ?? otherTwin.label ?? "other twin";
          setMovedToTwin(name);
          setTimeout(() => setMovedToTwin(null), 1800);
        },
      },
    );
  }

  const lastEntry = entries.length > 0
    ? [...entries].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0]
    : null;

  void tick;

  return (
    <Layout>
      <PageHeader
        title="Diaper Tracker"
        subtitle="Quick log for each change"
        right={
          <a href="stats?section=diapers" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-muted">
            📊 Stats
          </a>
        }
      />

      {twins.length > 0 && (
        <TwinTabs twins={twins} activeTwinId={twinId} onSelect={setActiveTwinId} />
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* Count summary */}
        {twinId && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</p>
            <div className="grid grid-cols-3 text-center gap-2">
              <div>
                <p className="text-2xl font-bold" style={{ color: "#83b8c0" }}>{entries.filter((e) => e.type === "wet").length}</p>
                <p className="text-xs text-muted-foreground">Wet</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#b58c5a" }}>{entries.filter((e) => e.type === "dirty").length}</p>
                <p className="text-xs text-muted-foreground">Dirty</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{entries.filter((e) => e.type === "mixed").length}</p>
                <p className="text-xs text-muted-foreground">Mixed</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{entries.length} total today</p>
                {lastEntry && (
                  <p className="text-xs text-muted-foreground">
                    Last: {formatTime(lastEntry.time)} · <span className="tabular-nums">{timeSince(lastEntry.time)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success toast */}
        <AnimatePresence>
          {justLogged && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-green-50 border border-green-200 rounded-xl py-3 px-4 text-center text-sm font-medium text-green-700"
            >
              {DIAPER_TYPES.find((d) => d.key === justLogged)?.emoji} Logged! Great job.
            </motion.div>
          )}
          {movedToTwin && (
            <motion.div
              key="moved"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-green-50 border border-green-200 rounded-xl py-3 px-4 text-center text-sm font-medium text-green-700"
            >
              ✅ Moved to {movedToTwin}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Big log buttons */}
        <div className="grid grid-cols-3 gap-3">
          {DIAPER_TYPES.map(({ key, label, emoji, color }) => (
            <button
              key={key}
              onClick={() => logDiaper(key)}
              disabled={!twinId || createEntry.isPending}
              className="py-8 rounded-2xl text-white font-semibold flex flex-col items-center gap-2 active:scale-90 transition-all shadow-sm disabled:opacity-50"
              style={{ backgroundColor: color }}
              data-testid={`button-diaper-${key}`}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Log */}
        {isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Today's Log</p>
            {[...entries].reverse().map((entry) => {
              const dt = DIAPER_TYPES.find((d) => d.key === entry.type);
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  data-testid={`diaper-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{dt?.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold capitalize">{dt?.label ?? entry.type}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(entry.time)}</p>
                      {entry.notes && <p className="text-xs text-muted-foreground/80 mt-0.5 italic">{entry.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="text-muted-foreground hover:text-primary p-2 transition-colors"
                      data-testid={`edit-diaper-${entry.id}`}
                      aria-label="Edit entry"
                    >
                      <Pencil size={13} />
                    </button>
                    {twins.length > 1 && (
                      <button
                        onClick={() => moveToOtherTwin(entry.id)}
                        className="text-muted-foreground hover:text-accent p-2 transition-colors"
                        aria-label={`Move to ${twins.find((t) => t.id !== twinId)?.name ?? "other twin"}`}
                        title={`Move to ${twins.find((t) => t.id !== twinId)?.name ?? "other twin"}`}
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidate })}
                      className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                      data-testid={`delete-diaper-${entry.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && entries.length === 0 && twinId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No diaper changes logged yet today.
          </div>
        )}

        {!twinId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Set up your twins in Settings first.
          </div>
        )}
      </div>

      {editingEntry && (
        <EditDiaperSheet
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={saveEdit}
        />
      )}
    </Layout>
  );
}
