import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useListTwins,
  useListFeedingEntries,
  useCreateFeedingEntry,
  useDeleteFeedingEntry,
  useGetFeedingSummary,
  getListFeedingEntriesQueryKey,
  getGetFeedingSummaryQueryKey,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { TwinTabs, PageHeader } from "@/components/Layout";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const FEEDING_TYPES = [
  { key: "breastfeeding", label: "Breast", color: "#da5a9f" },
  { key: "bottle", label: "Bottle", color: "#2e818c" },
  { key: "formula", label: "Formula", color: "#83b8c0" },
  { key: "solids", label: "Solids", color: "#b58c5a" },
] as const;

type FeedingType = "breastfeeding" | "bottle" | "formula" | "solids";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Feeding() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const [activeTwinId, setActiveTwinId] = useState<number | null>(null);
  const twinId = activeTwinId ?? twins[0]?.id ?? null;

  useEffect(() => {
    if (twins.length > 0 && activeTwinId === null) setActiveTwinId(twins[0].id);
  }, [twins, activeTwinId]);

  const { data: entries = [], isLoading } = useListFeedingEntries(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getListFeedingEntriesQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const { data: summary } = useGetFeedingSummary(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getGetFeedingSummaryQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const createEntry = useCreateFeedingEntry();
  const deleteEntry = useDeleteFeedingEntry();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListFeedingEntriesQueryKey({ twinId: twinId ?? 0, date: today }) });
    qc.invalidateQueries({ queryKey: getGetFeedingSummaryQueryKey({ twinId: twinId ?? 0, date: today }) });
  }

  function logFeeding(feedingType: FeedingType) {
    if (!twinId) return;
    createEntry.mutate(
      { data: { twinId, feedingType, time: new Date().toISOString() } },
      { onSuccess: invalidate },
    );
  }

  return (
    <Layout>
      <PageHeader title="Feeding Tracker" subtitle="Log every feeding for each twin" />

      {twins.length > 0 && (
        <TwinTabs twins={twins} activeTwinId={twinId} onSelect={setActiveTwinId} />
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* Summary */}
        {summary && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today's Total</p>
            <p className="text-3xl font-bold text-primary mb-3">{summary.totalFeedings} feedings</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="font-bold text-[#da5a9f]">{summary.breastfeedingCount}</p><p className="text-xs text-muted-foreground">Breast</p></div>
              <div><p className="font-bold text-accent">{summary.bottleCount}</p><p className="text-xs text-muted-foreground">Bottle</p></div>
              <div><p className="font-bold text-secondary">{summary.formulaCount}</p><p className="text-xs text-muted-foreground">Formula</p></div>
              <div><p className="font-bold text-[#b58c5a]">{summary.solidsCount}</p><p className="text-xs text-muted-foreground">Solids</p></div>
            </div>
          </div>
        )}

        {/* Quick log buttons */}
        <div className="grid grid-cols-2 gap-3">
          {FEEDING_TYPES.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => logFeeding(key)}
              disabled={!twinId || createEntry.isPending}
              className="py-5 rounded-2xl text-white font-semibold flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              style={{ backgroundColor: color }}
              data-testid={`button-log-${key}`}
            >
              <span className="text-2xl">{feedingIcon(key)}</span>
              <span>{label}</span>
              <span className="text-xs opacity-80">Tap to log now</span>
            </button>
          ))}
        </div>

        {/* Log */}
        {isLoading && <Skeleton className="h-24 rounded-2xl" />}
        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Today's Log</p>
            {[...entries].reverse().map((entry) => {
              const ft = FEEDING_TYPES.find((f) => f.key === entry.feedingType);
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  data-testid={`feeding-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: ft?.color ?? "#888" }}
                    >
                      {feedingIcon(entry.feedingType)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize">{ft?.label ?? entry.feedingType}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(entry.time)}
                        {entry.quantity ? ` · ${entry.quantity}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidate })}
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                    data-testid={`delete-feeding-${entry.id}`}
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
            No feedings logged yet today. Tap a button above to log.
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

function feedingIcon(type: string) {
  switch (type) {
    case "breastfeeding": return "🤱";
    case "bottle": return "🍼";
    case "formula": return "🧴";
    case "solids": return "🥣";
    default: return "🍼";
  }
}
