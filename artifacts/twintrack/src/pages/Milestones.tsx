import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useListMilestones,
  useCreateMilestone,
  useDeleteMilestone,
  getListMilestonesQueryKey,
  useListTwins,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Plus, Trash2, X, Check, ChevronRight } from "lucide-react";

const MILESTONE_PRESETS = [
  { key: "first-smile", label: "First Smile", emoji: "😊" },
  { key: "first-laugh", label: "First Laugh", emoji: "😂" },
  { key: "rolled-over", label: "Rolled Over", emoji: "🔄" },
  { key: "sat-up", label: "Sat Up", emoji: "🧘" },
  { key: "crawled", label: "Crawled", emoji: "🐛" },
  { key: "first-tooth", label: "First Tooth", emoji: "🦷" },
  { key: "first-word", label: "First Word", emoji: "💬" },
  { key: "first-steps", label: "First Steps", emoji: "👣" },
  { key: "slept-through-night", label: "Slept Through the Night", emoji: "🌙" },
  { key: "first-daycare", label: "First Daycare Day", emoji: "🎒" },
  { key: "first-birthday", label: "First Birthday", emoji: "🎂" },
  { key: "potty-training", label: "Potty Training", emoji: "🚽" },
  { key: "first-school", label: "First Day of School", emoji: "🏫" },
  { key: "custom", label: "Custom Milestone ✨", emoji: "⭐" },
];

const ENCOURAGEMENTS = [
  "You'll never forget this moment 💕",
  "Twin A just unlocked a beautiful new milestone 💕",
  "Every milestone is a memory forever 🌟",
  "You're watching magic happen ✨",
  "This is one of those moments 💛",
  "Precious. Just precious. 🥹",
];

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = Array.from({ length: 20 });
  const colors = ["#da5a9f", "#2e818c", "#83b8c0", "#ffd700", "#ff6b6b", "#a8e6cf"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-sm animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.6 + Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

export default function Milestones() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "twinA" | "twinB">("all");
  const [showModal, setShowModal] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    twinId: 0,
    category: "",
    title: "",
    achievedDate: new Date().toISOString().split("T")[0],
    note: "",
    isCustom: false,
  });

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const twinA = twins.find((t) => t.label === "Twin A");
  const twinB = twins.find((t) => t.label === "Twin B");

  const activeTwinId =
    activeTab === "twinA" ? twinA?.id : activeTab === "twinB" ? twinB?.id : undefined;

  const { data: milestones = [], isLoading } = useListMilestones(
    { userId: user?.id ?? "", ...(activeTwinId ? { twinId: activeTwinId } : {}) },
    {
      query: {
        enabled: !!user?.id,
        queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "", ...(activeTwinId ? { twinId: activeTwinId } : {}) }),
      },
    },
  );

  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const allMilestones = [...milestones].sort(
    (a, b) => new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime(),
  );

  function openModal() {
    setForm({
      twinId: twinA?.id ?? 0,
      category: "",
      title: "",
      achievedDate: new Date().toISOString().split("T")[0],
      note: "",
      isCustom: false,
    });
    setShowModal(true);
  }

  function selectPreset(key: string, label: string) {
    const isCustom = key === "custom";
    setForm((f) => ({
      ...f,
      category: key,
      title: isCustom ? "" : label,
      isCustom,
    }));
  }

  function handleSave() {
    if (!user?.id || !form.twinId || !form.category || !form.achievedDate) return;
    const title = form.isCustom ? form.title : (MILESTONE_PRESETS.find((m) => m.key === form.category)?.label ?? form.title);
    if (!title) return;

    createMilestone.mutate(
      {
        data: {
          userId: user.id,
          twinId: form.twinId,
          category: form.category,
          title,
          achievedDate: form.achievedDate,
          note: form.note || null,
          photoUrl: null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMilestonesQueryKey({ userId: user.id }) });
          setShowModal(false);
          const enc = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
          setEncouragement(enc);
          setConfetti(true);
          setShowCelebration(true);
          setTimeout(() => {
            setConfetti(false);
            setTimeout(() => setShowCelebration(false), 2000);
          }, 2500);
        },
      },
    );
  }

  function handleDelete(id: number) {
    deleteMilestone.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "" }) });
          setDeleteConfirm(null);
        },
      },
    );
  }

  function getTwinForMilestone(twinId: number) {
    return twins.find((t) => t.id === twinId);
  }

  const milestonesByTwin = {
    A: allMilestones.filter((m) => m.twinId === twinA?.id),
    B: allMilestones.filter((m) => m.twinId === twinB?.id),
  };

  const commonCategories = milestonesByTwin.A
    .map((m) => m.category)
    .filter((cat) => milestonesByTwin.B.some((m) => m.category === cat));

  return (
    <Layout>
      <Confetti show={confetti} />
      <PageHeader title="Memories" subtitle="Your twin milestone timeline" />

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 border border-primary/20 rounded-3xl px-8 py-6 mx-6 text-center shadow-2xl">
            <p className="text-4xl mb-2">💕</p>
            <p className="font-bold text-foreground text-lg">{encouragement}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 border-b border-border">
        {[
          { key: "all", label: "All Memories" },
          { key: "twinA", label: twinA?.name || "Twin A" },
          { key: "twinB", label: twinB?.name || "Twin B" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`tab-milestone-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Add milestone button */}
        <button
          onClick={openModal}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all"
          data-testid="button-add-milestone"
        >
          <Plus size={18} />
          Log a New Milestone
        </button>

        {/* Twin comparison (only when viewing "all") */}
        {activeTab === "all" && twinA && twinB && commonCategories.length > 0 && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/15 p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Twin Journey</p>
            <p className="text-xs text-muted-foreground mb-3">
              Both {twinA.name || "Twin A"} and {twinB.name || "Twin B"} have reached{" "}
              {commonCategories.length} milestone{commonCategories.length !== 1 ? "s" : ""} so far. 💕
              {" "}Every twin develops beautifully in their own time.
            </p>
            <div className="flex gap-2 flex-wrap">
              {commonCategories.map((cat) => {
                const preset = MILESTONE_PRESETS.find((m) => m.key === cat);
                return (
                  <span key={cat} className="text-xs bg-white border border-primary/20 px-2 py-1 rounded-full text-foreground font-medium">
                    {preset?.emoji} {preset?.label ?? cat}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allMilestones.length === 0 && (
          <div className="text-center py-14 space-y-3">
            <p className="text-5xl">💕</p>
            <p className="font-semibold text-foreground">No milestones yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Every first moment deserves to be remembered. Tap above to log your first milestone.
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-3">
          {allMilestones.map((milestone) => {
            const twin = getTwinForMilestone(milestone.twinId);
            const preset = MILESTONE_PRESETS.find((m) => m.key === milestone.category);
            return (
              <div
                key={milestone.id}
                className="bg-white rounded-2xl border border-border overflow-hidden"
                data-testid={`milestone-${milestone.id}`}
              >
                <div className="px-4 py-4 flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{preset?.emoji ?? "⭐"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(milestone.achievedDate)}</p>
                      </div>
                      {twin && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: twin.colorTheme }}
                        >
                          {(twin.name || twin.label).charAt(0)}
                        </div>
                      )}
                    </div>
                    {twin && (
                      <p className="text-xs font-medium mt-1" style={{ color: twin.colorTheme }}>
                        {twin.name || twin.label}
                      </p>
                    )}
                    {milestone.note && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic">
                        "{milestone.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <div className="border-t border-border px-4 py-2 flex justify-end">
                  {deleteConfirm === milestone.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Remove this memory?</span>
                      <button
                        onClick={() => handleDelete(milestone.id)}
                        className="text-xs text-destructive font-semibold px-3 py-1 rounded-lg bg-destructive/10"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-muted-foreground font-semibold px-3 py-1 rounded-lg bg-muted"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(milestone.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 py-1 px-2"
                      data-testid={`delete-milestone-${milestone.id}`}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl overflow-y-auto max-h-[90dvh]">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground text-lg">Log a Milestone</p>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-muted"
                data-testid="close-milestone-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5 pb-8">
              {/* Which twin */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">For which twin?</label>
                <div className="flex gap-2">
                  {twins.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm((f) => ({ ...f, twinId: t.id }))}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                        form.twinId === t.id ? "text-white" : "bg-muted text-muted-foreground"
                      }`}
                      style={form.twinId === t.id ? { backgroundColor: t.colorTheme } : {}}
                      data-testid={`select-twin-${t.id}`}
                    >
                      {t.name || t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestone type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Milestone</label>
                <div className="grid grid-cols-2 gap-2">
                  {MILESTONE_PRESETS.map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => selectPreset(key, label)}
                      className={`text-left px-3 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        form.category === key ? "bg-primary text-white" : "bg-muted text-foreground"
                      }`}
                      data-testid={`milestone-preset-${key}`}
                    >
                      <span className="text-base">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom title */}
              {form.isCustom && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custom milestone name</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Describe this milestone..."
                    className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30"
                    data-testid="input-custom-milestone"
                  />
                </div>
              )}

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Date achieved</label>
                <input
                  type="date"
                  value={form.achievedDate}
                  onChange={(e) => setForm((f) => ({ ...f, achievedDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30"
                  data-testid="input-milestone-date"
                />
              </div>

              {/* Memory note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Memory note (optional)</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="How did it happen? What were you feeling?..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
                  data-testid="input-milestone-note"
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={createMilestone.isPending || !form.category || !form.twinId || (form.isCustom && !form.title)}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                data-testid="button-save-milestone"
              >
                <Check size={20} />
                Save This Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
