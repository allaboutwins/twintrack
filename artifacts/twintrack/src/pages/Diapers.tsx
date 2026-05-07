import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useListTwins,
  useListDiaperEntries,
  useCreateDiaperEntry,
  useDeleteDiaperEntry,
  getListDiaperEntriesQueryKey,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { TwinTabs, PageHeader } from "@/components/Layout";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

type DiaperType = "wet" | "dirty" | "mixed";

const DIAPER_TYPES: { key: DiaperType; label: string; emoji: string; color: string }[] = [
  { key: "wet", label: "Wet", emoji: "💧", color: "#83b8c0" },
  { key: "dirty", label: "Dirty", emoji: "💩", color: "#b58c5a" },
  { key: "mixed", label: "Mixed", emoji: "🔄", color: "#2e818c" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Diapers() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [justLogged, setJustLogged] = useState<DiaperType | null>(null);

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const [activeTwinId, setActiveTwinId] = useState<number | null>(null);
  const twinId = activeTwinId ?? twins[0]?.id ?? null;

  useEffect(() => {
    if (twins.length > 0 && activeTwinId === null) setActiveTwinId(twins[0].id);
  }, [twins, activeTwinId]);

  const { data: entries = [], isLoading } = useListDiaperEntries(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getListDiaperEntriesQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const createEntry = useCreateDiaperEntry();
  const deleteEntry = useDeleteDiaperEntry();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListDiaperEntriesQueryKey({ twinId: twinId ?? 0, date: today }) });
  }

  function logDiaper(type: DiaperType) {
    if (!twinId) return;
    setJustLogged(type);
    setTimeout(() => setJustLogged(null), 1200);
    createEntry.mutate(
      { data: { twinId, type, time: new Date().toISOString() } },
      { onSuccess: invalidate },
    );
  }

  const wetCount = entries.filter((e) => e.type === "wet" || e.type === "mixed").length;
  const dirtyCount = entries.filter((e) => e.type === "dirty" || e.type === "mixed").length;

  return (
    <Layout>
      <PageHeader title="Diaper Tracker" subtitle="Quick log for each change" />

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
            <div className="mt-3 pt-3 border-t border-border text-center">
              <p className="text-sm font-medium text-foreground">{entries.length} total changes today</p>
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
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidate })}
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                    data-testid={`delete-diaper-${entry.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
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
    </Layout>
  );
}
