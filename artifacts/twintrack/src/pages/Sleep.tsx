import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useListTwins,
  useListSleepEntries,
  useCreateSleepEntry,
  useUpdateSleepEntry,
  useDeleteSleepEntry,
  useGetSleepSummary,
  getListSleepEntriesQueryKey,
  getGetSleepSummaryQueryKey,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { TwinTabs, PageHeader } from "@/components/Layout";
import { Moon, Play, Square, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function elapsed(startIso: string) {
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SleepEntry = {
  id: number;
  type: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
};

function EditSleepSheet({
  entry,
  onClose,
  onSave,
}: {
  entry: SleepEntry;
  onClose: () => void;
  onSave: (updates: { type: string; startTime: string; endTime: string | null; durationMinutes: number | null }) => void;
}) {
  const [type, setType] = useState<"nap" | "night">(entry.type === "night" ? "night" : "nap");
  const [startVal, setStartVal] = useState(toDatetimeLocal(entry.startTime));
  const [endVal, setEndVal] = useState(entry.endTime ? toDatetimeLocal(entry.endTime) : "");

  function calcDuration(): number | null {
    if (!endVal) return null;
    const start = new Date(startVal).getTime();
    const end = new Date(endVal).getTime();
    const mins = Math.round((end - start) / 60000);
    return mins > 0 ? mins : null;
  }

  function save() {
    const duration = calcDuration();
    onSave({
      type,
      startTime: new Date(startVal).toISOString(),
      endTime: endVal ? new Date(endVal).toISOString() : null,
      durationMinutes: duration,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 safe-area-pb">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Edit Sleep Entry</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Type</p>
          <div className="flex gap-2">
            {(["nap", "night"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === t ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {t === "nap" ? "🌤 Nap" : "🌙 Night Sleep"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Start Time</p>
          <input
            type="datetime-local"
            value={startVal}
            onChange={(e) => setStartVal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">End Time (leave blank if ongoing)</p>
          <input
            type="datetime-local"
            value={endVal}
            onChange={(e) => setEndVal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        {endVal && calcDuration() !== null && (
          <p className="text-xs text-muted-foreground text-center">
            Duration: <span className="font-semibold text-primary">{formatMinutes(calcDuration()!)}</span>
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
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

export default function Sleep() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA");
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toLocaleDateString("en-CA");
  const [tick, setTick] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"nap" | "night">("nap");
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
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

  const { data: entries = [], isLoading } = useListSleepEntries(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getListSleepEntriesQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const { data: yesterdayEntries = [] } = useListSleepEntries(
    { twinId: twinId ?? 0, date: yesterday },
    { query: { enabled: !!twinId, queryKey: getListSleepEntriesQueryKey({ twinId: twinId ?? 0, date: yesterday }) } },
  );

  const { data: summary } = useGetSleepSummary(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getGetSleepSummaryQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const createEntry = useCreateSleepEntry();
  const updateEntry = useUpdateSleepEntry();
  const deleteEntry = useDeleteSleepEntry();

  const activeEntry = entries.find((e) => !e.endTime) ?? yesterdayEntries.find((e) => !e.endTime);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListSleepEntriesQueryKey({ twinId: twinId ?? 0, date: today }) });
    qc.invalidateQueries({ queryKey: getListSleepEntriesQueryKey({ twinId: twinId ?? 0, date: yesterday }) });
    qc.invalidateQueries({ queryKey: getGetSleepSummaryQueryKey({ twinId: twinId ?? 0, date: today }) });
  }

  function startSleep(type: "nap" | "night") {
    if (!twinId) return;
    createEntry.mutate(
      { data: { twinId, type, startTime: new Date().toISOString() } },
      { onSuccess: invalidate },
    );
  }

  function stopSleep() {
    if (!activeEntry) return;
    const endTime = new Date().toISOString();
    const durationMinutes = Math.floor(
      (new Date(endTime).getTime() - new Date(activeEntry.startTime).getTime()) / 60000,
    );
    updateEntry.mutate(
      { id: activeEntry.id, data: { endTime, durationMinutes } },
      { onSuccess: invalidate },
    );
  }

  function addManual() {
    if (!twinId) return;
    const start = new Date();
    start.setHours(start.getHours() - 1);
    createEntry.mutate(
      {
        data: {
          twinId,
          type: addType,
          startTime: start.toISOString(),
          endTime: new Date().toISOString(),
          durationMinutes: 60,
        },
      },
      { onSuccess: () => { invalidate(); setShowAdd(false); } },
    );
  }

  function saveEdit(updates: { type: string; startTime: string; endTime: string | null; durationMinutes: number | null }) {
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

  return (
    <Layout>
      <PageHeader title="Sleep Tracker" subtitle="Track naps and night sleep" />

      {twins.length > 0 && (
        <TwinTabs
          twins={twins}
          activeTwinId={twinId}
          onSelect={setActiveTwinId}
        />
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* Today summary */}
        {summary && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-primary">{formatMinutes(summary.dailyTotalMinutes)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-xl font-bold text-accent">{summary.napCount}</p>
                <p className="text-xs text-muted-foreground">Naps</p>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary">{formatMinutes(summary.nightSleepMinutes)}</p>
                <p className="text-xs text-muted-foreground">Night</p>
              </div>
            </div>
            {summary.weeklyTotalMinutes > 0 && (
              <div className="mt-3 pt-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  7-day avg: <span className="font-semibold text-foreground">{formatMinutes(Math.round(summary.weeklyTotalMinutes / 7))}/day</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Active sleep timer */}
        {activeEntry && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold capitalize">{activeEntry.type} in progress</span>
            </div>
            <p className="text-3xl font-bold text-primary font-mono">{elapsed(activeEntry.startTime)}</p>
            <p className="text-xs text-muted-foreground">Started at {formatTime(activeEntry.startTime)}</p>
            <button
              onClick={stopSleep}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              data-testid="button-stop-sleep"
            >
              <Square size={16} fill="white" />
              Stop Timer
            </button>
          </div>
        )}

        {/* Start buttons */}
        {!activeEntry && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startSleep("nap")}
              disabled={!twinId}
              className="py-5 rounded-2xl bg-primary text-white font-semibold flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              data-testid="button-start-nap"
            >
              <Play size={20} fill="white" />
              <span>Start Nap</span>
            </button>
            <button
              onClick={() => startSleep("night")}
              disabled={!twinId}
              className="py-5 rounded-2xl bg-accent text-white font-semibold flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              data-testid="button-start-night"
            >
              <Moon size={20} />
              <span>Night Sleep</span>
            </button>
          </div>
        )}

        {/* Manual add */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
          data-testid="button-add-manual-sleep"
        >
          <Plus size={16} />
          Add Manual Entry
        </button>

        {showAdd && (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <p className="font-semibold text-sm text-foreground">Add 1-hour entry (now)</p>
            <div className="flex gap-2">
              {(["nap", "night"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAddType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    addType === t ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t === "nap" ? "Nap" : "Night Sleep"}
                </button>
              ))}
            </div>
            <button
              onClick={addManual}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm active:scale-95 transition-all"
              data-testid="button-confirm-add-sleep"
            >
              Add Entry
            </button>
          </div>
        )}

        {/* Sleep log */}
        {isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Today's Log</p>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                data-testid={`sleep-entry-${entry.id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.type === "nap" ? "bg-primary/10" : "bg-accent/10"
                    }`}
                  >
                    <Moon size={14} className={entry.type === "nap" ? "text-primary" : "text-accent"} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{entry.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(entry.startTime)}
                      {entry.endTime ? ` – ${formatTime(entry.endTime)}` : " (ongoing)"}
                      {entry.durationMinutes ? ` · ${formatMinutes(entry.durationMinutes)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="text-muted-foreground hover:text-primary p-2 transition-colors"
                    data-testid={`edit-sleep-${entry.id}`}
                    aria-label="Edit entry"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() =>
                      deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidate })
                    }
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                    data-testid={`delete-sleep-${entry.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && entries.length === 0 && twinId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No sleep entries yet today. Start the timer above.
          </div>
        )}

        {!twinId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Set up your twins in Settings first.
          </div>
        )}
      </div>

      {editingEntry && (
        <EditSleepSheet
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={saveEdit}
        />
      )}
    </Layout>
  );
}
