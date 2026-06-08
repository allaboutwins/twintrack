import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTwins,
  getListTwinsQueryKey,
  useListBathEntries,
  getListBathEntriesQueryKey,
  useCreateBathEntry,
  useDeleteBathEntry,
} from "@workspace/api-client-react";
import Layout, { PageHeader, TwinTabs } from "@/components/Layout";

export default function Bath() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA");
  const [activeTwinId, setActiveTwinId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  useEffect(() => {
    if (twins.length > 0 && activeTwinId === null) setActiveTwinId(twins[0].id);
  }, [twins, activeTwinId]);

  const twinId = activeTwinId ?? twins[0]?.id ?? null;

  const { data: entries = [], isLoading } = useListBathEntries(
    { twinId: twinId ?? 0, date: today },
    { query: { enabled: !!twinId, queryKey: getListBathEntriesQueryKey({ twinId: twinId ?? 0, date: today }) } },
  );

  const createEntry = useCreateBathEntry();
  const deleteEntry = useDeleteBathEntry();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListBathEntriesQueryKey({ twinId: twinId ?? 0, date: today }) });
  }

  function logBath() {
    if (!twinId) return;
    const now = new Date();
    createEntry.mutate(
      {
        data: {
          twinId,
          notedAt: now.toISOString(),
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setNotes("");
          setShowForm(false);
          setJustLogged(true);
          setTimeout(() => setJustLogged(false), 2500);
        },
      },
    );
  }

  function removeEntry(id: number) {
    deleteEntry.mutate(
      { id },
      { onSuccess: invalidate },
    );
  }

  const activeTwin = twins.find((t) => t.id === twinId);

  return (
    <Layout>
      <PageHeader title="Bath Tracker 🛁" />

      {twins.length > 1 && (
        <TwinTabs
          twins={twins}
          activeTwinId={twinId}
          onSelect={setActiveTwinId}
        />
      )}

      <div className="px-4 pb-28 space-y-4 pt-2">
        {justLogged && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🛁</p>
            <p className="text-sm font-semibold text-green-800">Bath logged!</p>
          </div>
        )}

        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full py-4 rounded-2xl bg-primary text-white text-base font-bold shadow-sm active:scale-[0.97] transition-all"
        >
          {showForm ? "Cancel" : "+ Log a Bath"}
        </button>

        {showForm && (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Logging bath for {activeTwin?.name ?? activeTwin?.label}
            </p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Hair washed, used lavender wash…"
                maxLength={200}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
              />
            </div>
            <button
              onClick={logBath}
              disabled={createEntry.isPending}
              className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {createEntry.isPending ? "Saving…" : "Save Bath 🛁"}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Today's Baths</p>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
          </div>

          {isLoading ? (
            <div className="p-5 text-center text-sm text-muted-foreground">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-3xl mb-2">🛁</p>
              <p className="text-sm text-muted-foreground">No baths logged today</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-lg mt-0.5">🛁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(entry.notedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
