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
import { Plus, Star, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
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

export default function Routines() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("morning");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");

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

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p className="text-4xl mb-3">📋</p>
            <p>No routines yet. Tap the + button to create one.</p>
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
