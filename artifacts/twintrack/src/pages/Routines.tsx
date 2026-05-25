import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  useListRoutines,
  useCreateRoutine,
  useUpdateRoutine,
  useDeleteRoutine,
  useUpdateRoutineTask,
  getListRoutinesQueryKey,
  getGetRoutineQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Plus, Star, Trash2, ChevronDown, ChevronUp, Check, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { key: "morning", label: "Morning", emoji: "☀️", color: "#da5a9f" },
  { key: "bedtime", label: "Bedtime", emoji: "🌙", color: "#2e818c" },
  { key: "outing", label: "Outing", emoji: "👜", color: "#83b8c0" },
  { key: "daycare", label: "Daycare", emoji: "🏫", color: "#b58c5a" },
  { key: "meal", label: "Meal", emoji: "🍽️", color: "#9b59b6" },
] as const;

type Category = "morning" | "bedtime" | "outing" | "daycare" | "meal";

const TEMPLATES: Record<Category, string[]> = {
  morning: ["Wake up twins", "Diaper change", "Morning feed", "Tummy time", "Get dressed", "Pack daycare bags"],
  bedtime: ["Bath time", "Lotion massage", "Put on PJs", "Last feed", "Story time", "Lights out"],
  outing: ["Pack diapers", "Prepare formula", "Pack snacks", "Bring extra clothes", "Stroller check", "Sunscreen"],
  daycare: ["Pack lunches", "Label bottles", "Sign-in sheets", "Pack comfort items", "Update teacher on night"],
  meal: ["Wash hands", "Prep high chairs", "Prepare bibs", "Serve food", "Clean up", "Wash hands again"],
};

const QUICK_START_TEMPLATES: Array<{
  title: string;
  category: Category;
  emoji: string;
  description: string;
  tasks: string[];
}> = [
  {
    title: "Newborn Twin Morning Routine",
    category: "morning",
    emoji: "🐣",
    description: "Gentle start for newborns",
    tasks: [
      "Wake & cuddle twins",
      "Diaper check & change",
      "Morning feed (both twins)",
      "Burp & settle",
      "Tummy time (10 min)",
      "Get dressed",
      "Log feed in TwinTrack",
    ],
  },
  {
    title: "Twin Bedtime Routine",
    category: "bedtime",
    emoji: "🌙",
    description: "Calm wind-down for both babies",
    tasks: [
      "Bath time (alternate nights)",
      "Lotion massage",
      "Put on PJs & sleep sack",
      "Last feed of the day",
      "Dim lights & white noise on",
      "Story or lullaby",
      "Lights out",
    ],
  },
  {
    title: "NICU Feeding Schedule",
    category: "meal",
    emoji: "🏥",
    description: "Structured feeds for NICU or preemie babies",
    tasks: [
      "Wash & sanitize hands",
      "Prepare expressed breast milk or formula",
      "Feed Twin A (log ml amount)",
      "Burp Twin A",
      "Feed Twin B (log ml amount)",
      "Burp Twin B",
      "Record feed time in TwinTrack",
      "Clean & sterilize bottles",
    ],
  },
  {
    title: "Pumping Schedule",
    category: "meal",
    emoji: "🍼",
    description: "Breast pumping reminders",
    tasks: [
      "Set up pump & flanges",
      "Pump 15–20 minutes",
      "Label & date milk storage bags",
      "Store in fridge or freezer",
      "Rinse pump parts",
      "Log pump session",
    ],
  },
  {
    title: "Toddler Twin Morning",
    category: "morning",
    emoji: "🧒",
    description: "Busy morning with older twins",
    tasks: [
      "Wake twins up gently",
      "Bathroom & potty time",
      "Get dressed (let them pick!)",
      "Breakfast together",
      "Brush teeth",
      "Pack school/daycare bags",
      "Out the door!",
    ],
  },
  {
    title: "Twin Outing Checklist",
    category: "outing",
    emoji: "👜",
    description: "Never forget anything again",
    tasks: [
      "Pack diaper bag (diapers × 4+)",
      "Prepare formula or breast milk",
      "Pack snacks & water",
      "Extra outfit per twin",
      "Sunscreen applied",
      "Stroller charged/folded",
      "Car seats secured",
      "Pacifiers & comfort toys",
    ],
  },
  {
    title: "Doctor Visit Checklist",
    category: "outing",
    emoji: "🩺",
    description: "Stay organized at appointments",
    tasks: [
      "Print or pull up insurance cards",
      "Bring vaccination records",
      "Write down questions for doctor",
      "Pack snacks & entertainment",
      "Extra diapers & wipes",
      "Note current weights & milestones",
      "Take notes during appointment",
    ],
  },
  {
    title: "Daycare Drop-Off",
    category: "daycare",
    emoji: "🏫",
    description: "Smooth mornings every day",
    tasks: [
      "Pack labeled bottles & formula",
      "Spare outfit per twin in bag",
      "Comfort item (stuffed animal etc.)",
      "Sign-in sheets",
      "Update teacher on last night",
      "Log any health notes",
    ],
  },
];

export default function Routines() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("morning");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);

  const { data: routines = [], isLoading } = useListRoutines(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListRoutinesQueryKey({ userId: user?.id ?? "" }) } },
  );

  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const updateTask = useUpdateRoutineTask();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListRoutinesQueryKey({ userId: user?.id ?? "" }) });
  }

  function handleCreate() {
    if (!user?.id || !newTitle.trim()) return;
    const tasks = TEMPLATES[newCategory].map((text, i) => ({ text, order: i }));
    createRoutine.mutate(
      { data: { userId: user.id, title: newTitle.trim(), category: newCategory, isFavorite: false, tasks } },
      {
        onSuccess: () => {
          invalidate();
          setNewTitle("");
          setShowCreate(false);
        },
      },
    );
  }

  function handleQuickStart(template: (typeof QUICK_START_TEMPLATES)[number]) {
    if (!user?.id) return;
    setAddingTemplate(template.title);
    const tasks = template.tasks.map((text, i) => ({ text, order: i }));
    createRoutine.mutate(
      { data: { userId: user.id, title: template.title, category: template.category, isFavorite: false, tasks } },
      {
        onSuccess: () => {
          invalidate();
          setAddingTemplate(null);
          setShowQuickStart(false);
        },
        onError: () => setAddingTemplate(null),
      },
    );
  }

  function toggleFavorite(id: number, current: boolean) {
    updateRoutine.mutate(
      { id, data: { isFavorite: !current } },
      { onSuccess: invalidate },
    );
  }

  function toggleTask(routineId: number, taskId: number, completed: boolean) {
    updateTask.mutate(
      { id: routineId, taskId, data: { completed: !completed } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListRoutinesQueryKey({ userId: user?.id ?? "" }) });
        },
      },
    );
  }

  const filtered =
    activeFilter === "all"
      ? routines
      : routines.filter((r) => r.category === activeFilter);

  const existingTitles = new Set(routines.map((r) => r.title));

  return (
    <Layout>
      <PageHeader
        title="Routines"
        subtitle="Daily checklists for twin life"
        right={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-all"
            data-testid="button-add-routine"
          >
            <Plus size={18} />
          </button>
        }
      />

      {/* Category filter */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pb-4">
        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <p className="font-semibold text-sm text-foreground">New Routine</p>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Routine name..."
              className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
              data-testid="input-routine-title"
            />
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setNewCategory(key)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    newCategory === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createRoutine.isPending}
                className="py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
                data-testid="button-create-routine"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Quick Start Templates */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setShowQuickStart((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
            data-testid="button-quick-start"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Zap size={15} className="text-violet-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-foreground">Quick Start Templates</p>
                <p className="text-xs text-muted-foreground">One-tap ready-made routines</p>
              </div>
            </div>
            {showQuickStart
              ? <ChevronUp size={16} className="text-muted-foreground" />
              : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {showQuickStart && (
            <div className="border-t border-border divide-y divide-border">
              {QUICK_START_TEMPLATES.map((tmpl) => {
                const cat = CATEGORIES.find((c) => c.key === tmpl.category);
                const alreadyAdded = existingTitles.has(tmpl.title);
                const isAdding = addingTemplate === tmpl.title;
                return (
                  <div key={tmpl.title} className="px-4 py-3.5 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: (cat?.color ?? "#888") + "20" }}
                    >
                      {tmpl.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{tmpl.title}</p>
                      <p className="text-xs text-muted-foreground">{tmpl.description} · {tmpl.tasks.length} tasks</p>
                    </div>
                    <button
                      onClick={() => !alreadyAdded && handleQuickStart(tmpl)}
                      disabled={alreadyAdded || isAdding}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                        alreadyAdded
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
                      } disabled:opacity-60`}
                    >
                      {alreadyAdded ? "✓ Added" : isAdding ? "Adding..." : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p className="text-4xl mb-3">📋</p>
            <p>No routines yet.</p>
            <p className="mt-1">Tap <span className="font-semibold text-primary">Quick Start</span> above to add one instantly.</p>
          </div>
        )}

        {filtered.map((routine) => {
          const cat = CATEGORIES.find((c) => c.key === routine.category);
          const expanded = expandedId === routine.id;
          const completedCount = routine.tasks.filter((t) => t.completed).length;
          const total = routine.tasks.length;
          const progress = total > 0 ? (completedCount / total) * 100 : 0;

          return (
            <div
              key={routine.id}
              className="bg-white rounded-2xl border border-border overflow-hidden"
              data-testid={`routine-${routine.id}`}
            >
              <div className="px-4 py-4 flex items-center justify-between">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => setExpandedId(expanded ? null : routine.id)}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: (cat?.color ?? "#888") + "20" }}
                  >
                    {cat?.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{routine.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {completedCount}/{total} done
                    </p>
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => toggleFavorite(routine.id, routine.isFavorite)}
                    className="p-2 transition-colors"
                    data-testid={`favorite-routine-${routine.id}`}
                  >
                    <Star
                      size={16}
                      className={routine.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}
                    />
                  </button>
                  <button
                    onClick={() =>
                      deleteRoutine.mutate({ id: routine.id }, { onSuccess: invalidate })
                    }
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`delete-routine-${routine.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="px-4 pb-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, backgroundColor: cat?.color ?? "#da5a9f" }}
                    />
                  </div>
                </div>
              )}

              {/* Tasks */}
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {routine.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(routine.id, task.id, task.completed)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                      data-testid={`task-${task.id}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          task.completed
                            ? "border-transparent"
                            : "border-border"
                        }`}
                        style={task.completed ? { backgroundColor: cat?.color ?? "#da5a9f" } : {}}
                      >
                        {task.completed && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <span
                        className={`text-sm flex-1 ${
                          task.completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
