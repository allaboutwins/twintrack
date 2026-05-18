import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import {
  useListTwins,
  useListFeedingEntries,
  useCreateFeedingEntry,
  useUpdateFeedingEntry,
  useDeleteFeedingEntry,
  useGetFeedingSummary,
  useListFoodsIntroduced,
  useCreateFoodIntroduced,
  useDeleteFoodIntroduced,
  getListFeedingEntriesQueryKey,
  getGetFeedingSummaryQueryKey,
  getListFoodsIntroducedQueryKey,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { TwinTabs, PageHeader } from "@/components/Layout";
import { Trash2, Pencil, X, Check, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Constants ─────────────────────────────────────────────────────────────

const FEEDING_TYPES = [
  { key: "breastfeeding", label: "Breast", emoji: "🤱", color: "#da5a9f" },
  { key: "bottle", label: "Bottle", emoji: "🍼", color: "#2e818c" },
  { key: "formula", label: "Formula", emoji: "🧴", color: "#83b8c0" },
  { key: "solids", label: "Solids", emoji: "🥣", color: "#b58c5a" },
] as const;

type FeedingType = (typeof FEEDING_TYPES)[number]["key"];

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 45, 60];

const COMMON_FOODS = [
  "Avocado", "Banana", "Sweet Potato", "Apple", "Pear",
  "Broccoli", "Carrot", "Peas", "Mango", "Peach",
  "Egg", "Chicken", "Salmon", "Tofu", "Lentils",
  "Oatmeal", "Rice", "Yogurt", "Cheese", "Blueberry",
];

const FOOD_CATEGORIES = [
  { key: "fruits", label: "Fruits", emoji: "🍎" },
  { key: "vegetables", label: "Vegetables", emoji: "🥦" },
  { key: "proteins", label: "Proteins", emoji: "🥩" },
  { key: "dairy", label: "Dairy", emoji: "🧀" },
  { key: "grains", label: "Grains", emoji: "🌾" },
  { key: "other", label: "Other", emoji: "🍽️" },
];

const REACTION_OPTIONS = [
  { key: "none", label: "No reaction", color: "#22c55e" },
  { key: "mild", label: "Mild reaction", color: "#f59e0b" },
  { key: "moderate", label: "Moderate", color: "#f97316" },
  { key: "severe", label: "Severe", color: "#ef4444" },
];

const OZ_TO_ML = 29.5735;

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mlToOz(ml: number) {
  return Math.round((ml / OZ_TO_ML) * 10) / 10;
}

function formatAmount(amountMl: number | null | undefined) {
  if (!amountMl) return null;
  return `${Math.round(amountMl)}ml (${mlToOz(amountMl)}oz)`;
}

function formatDuration(mins: number | null | undefined) {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function categoryEmoji(cat: string) {
  return FOOD_CATEGORIES.find((c) => c.key === cat)?.emoji ?? "🍽️";
}

function reactionBadge(reaction: string | null | undefined) {
  if (!reaction || reaction === "none") return null;
  const r = REACTION_OPTIONS.find((o) => o.key === reaction);
  if (!r) return null;
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
      style={{ backgroundColor: r.color }}
    >
      {r.label}
    </span>
  );
}

// ── Log Feeding Sheet ─────────────────────────────────────────────────────

type LogSheetProps = {
  feedingType: FeedingType;
  onClose: () => void;
  onLog: (data: {
    side?: string | null;
    durationMinutes?: number | null;
    amountMl?: number | null;
    foodName?: string | null;
    notes?: string | null;
  }) => void;
  isPending: boolean;
};

function LogFeedingSheet({ feedingType, onClose, onLog, isPending }: LogSheetProps) {
  const ft = FEEDING_TYPES.find((f) => f.key === feedingType)!;

  // Breastfeeding state
  const [side, setSide] = useState<"left" | "right" | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // Bottle / Formula state
  const [amountUnit, setAmountUnit] = useState<"ml" | "oz">("ml");
  const [amountInput, setAmountInput] = useState("");

  // Solids state
  const [foodName, setFoodName] = useState("");

  // Shared
  const [notes, setNotes] = useState("");

  function handleLog() {
    let amountMl: number | null = null;
    if ((feedingType === "bottle" || feedingType === "formula") && amountInput) {
      const val = parseFloat(amountInput);
      if (!isNaN(val)) {
        amountMl = amountUnit === "oz" ? val * OZ_TO_ML : val;
      }
    }
    onLog({
      side: feedingType === "breastfeeding" ? side : null,
      durationMinutes: feedingType === "breastfeeding" ? duration : null,
      amountMl,
      foodName: feedingType === "solids" ? (foodName.trim() || null) : null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 safe-area-pb overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base" style={{ backgroundColor: ft.color }}>
              {ft.emoji}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Log {ft.label}</h3>
              <p className="text-xs text-muted-foreground">All details optional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Breastfeeding: Side + Duration */}
        {feedingType === "breastfeeding" && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Side</p>
              <div className="grid grid-cols-2 gap-2">
                {(["left", "right"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(side === s ? null : s)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all border ${
                      side === s
                        ? "text-white border-transparent shadow-sm"
                        : "bg-muted/60 text-muted-foreground border-transparent"
                    }`}
                    style={side === s ? { backgroundColor: ft.color } : {}}
                  >
                    {s === "left" ? "⬅️ Left" : "Right ➡️"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Duration</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(duration === mins ? null : mins)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      duration === mins
                        ? "text-white border-transparent"
                        : "bg-muted/60 text-muted-foreground border-transparent"
                    }`}
                    style={duration === mins ? { backgroundColor: ft.color } : {}}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bottle / Formula: Amount */}
        {(feedingType === "bottle" || feedingType === "formula") && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Amount</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder={amountUnit === "ml" ? "e.g. 150" : "e.g. 5"}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
              />
              <div className="flex rounded-xl overflow-hidden border border-border">
                {(["ml", "oz"] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => {
                      if (amountUnit !== unit && amountInput) {
                        const val = parseFloat(amountInput);
                        if (!isNaN(val)) {
                          setAmountInput(
                            unit === "oz"
                              ? String(Math.round((val / OZ_TO_ML) * 10) / 10)
                              : String(Math.round(val * OZ_TO_ML)),
                          );
                        }
                      }
                      setAmountUnit(unit);
                    }}
                    className={`px-3 py-3 text-xs font-semibold transition-all ${
                      amountUnit === unit ? "text-white" : "bg-muted/30 text-muted-foreground"
                    }`}
                    style={amountUnit === unit ? { backgroundColor: ft.color } : {}}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
            {amountInput && !isNaN(parseFloat(amountInput)) && (
              <p className="text-xs text-muted-foreground mt-1 px-1">
                ≈ {amountUnit === "ml"
                  ? `${mlToOz(parseFloat(amountInput))} oz`
                  : `${Math.round(parseFloat(amountInput) * OZ_TO_ML)} ml`}
              </p>
            )}
          </div>
        )}

        {/* Solids: Food name */}
        {feedingType === "solids" && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Food</p>
            <input
              type="text"
              placeholder="What did they eat?"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_FOODS.map((food) => (
                <button
                  key={food}
                  onClick={() => setFoodName(food)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    foodName === food
                      ? "text-white border-transparent"
                      : "bg-muted/60 text-muted-foreground border-transparent"
                  }`}
                  style={foodName === food ? { backgroundColor: ft.color } : {}}
                >
                  {food}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notes (optional)</p>
          <input
            type="text"
            placeholder="Any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        {/* Log button */}
        <button
          onClick={handleLog}
          disabled={isPending}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
          style={{ backgroundColor: ft.color }}
        >
          <Check size={16} />
          {isPending ? "Logging…" : `Log ${ft.label}`}
        </button>
      </div>
    </div>
  );
}

// ── Edit Feeding Sheet ────────────────────────────────────────────────────

type EditEntry = {
  id: number;
  feedingType: string;
  time: string;
  side?: string | null;
  durationMinutes?: number | null;
  amountMl?: number | null;
  foodName?: string | null;
  notes?: string | null;
};

function EditFeedingSheet({
  entry,
  onClose,
  onSave,
  isPending,
}: {
  entry: EditEntry;
  onClose: () => void;
  onSave: (updates: { feedingType: string; time: string; notes?: string | null }) => void;
  isPending: boolean;
}) {
  const [feedType, setFeedType] = useState<FeedingType>(entry.feedingType as FeedingType);
  const [timeVal, setTimeVal] = useState(toDatetimeLocal(entry.time));
  const [notes, setNotes] = useState(entry.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 safe-area-pb">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Edit Feeding Entry</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDING_TYPES.map(({ key, label, emoji, color }) => (
              <button
                key={key}
                onClick={() => setFeedType(key)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
                  feedType === key ? "text-white border-transparent shadow-sm" : "bg-muted text-muted-foreground border-transparent"
                }`}
                style={feedType === key ? { backgroundColor: color } : {}}
              >
                {emoji} {label}
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
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notes</p>
          <input
            type="text"
            placeholder="Any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave({ feedingType: feedType, time: new Date(timeVal).toISOString(), notes: notes.trim() || null })}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Check size={15} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Food Sheet ────────────────────────────────────────────────────────

function AddFoodSheet({
  twinId,
  onClose,
  onSave,
  isPending,
}: {
  twinId: number;
  onClose: () => void;
  onSave: (data: { twinId: number; foodName: string; category: string; firstIntroduced: string; reaction?: string | null; notes?: string | null }) => void;
  isPending: boolean;
}) {
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reaction, setReaction] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const canSubmit = foodName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 safe-area-pb overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">Add Food to Journal</h3>
            <p className="text-xs text-muted-foreground">Track foods introduced to your little one</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Food Name</p>
          <input
            type="text"
            placeholder="e.g. Avocado, Sweet Potato..."
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 mb-2"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FOODS.slice(0, 12).map((food) => (
              <button
                key={food}
                onClick={() => setFoodName(food)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  foodName === food ? "bg-[#b58c5a] text-white border-transparent" : "bg-muted/60 text-muted-foreground border-transparent"
                }`}
              >
                {food}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
          <div className="grid grid-cols-3 gap-2">
            {FOOD_CATEGORIES.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
                  category === key ? "bg-[#b58c5a] text-white" : "bg-muted/60 text-muted-foreground"
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Date First Tried</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Reaction</p>
          <div className="grid grid-cols-2 gap-2">
            {REACTION_OPTIONS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setReaction(key)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                  reaction === key ? "text-white border-transparent" : "bg-muted/60 text-muted-foreground border-transparent"
                }`}
                style={reaction === key ? { backgroundColor: color } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notes (optional)</p>
          <input
            type="text"
            placeholder="Liked it? Mixed in with something?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        <button
          onClick={() =>
            onSave({
              twinId,
              foodName: foodName.trim(),
              category,
              firstIntroduced: date,
              reaction: reaction === "none" ? null : reaction,
              notes: notes.trim() || null,
            })
          }
          disabled={!canSubmit || isPending}
          className="w-full py-3.5 rounded-2xl bg-[#b58c5a] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          <Check size={16} />
          {isPending ? "Saving…" : "Save to Journal"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Feeding() {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

  const [activeTwinId, setActiveTwinId] = useState<number | null>(null);
  const [logSheetType, setLogSheetType] = useState<FeedingType | null>(null);
  const [editingEntry, setEditingEntry] = useState<EditEntry | null>(null);
  const [showAddFood, setShowAddFood] = useState(false);
  const [foodsExpanded, setFoodsExpanded] = useState(true);

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const twinId = activeTwinId ?? twins[0]?.id ?? null;

  useEffect(() => {
    if (twins.length > 0 && activeTwinId === null) setActiveTwinId(twins[0].id);
  }, [twins, activeTwinId]);

  const queryParams = { twinId: twinId ?? 0, date: today, timezone: TZ };
  const queryEnabled = { query: { enabled: !!twinId } };

  const { data: entries = [], isLoading } = useListFeedingEntries(
    queryParams,
    { query: { enabled: !!twinId, queryKey: getListFeedingEntriesQueryKey(queryParams) } },
  );

  const { data: summary } = useGetFeedingSummary(
    queryParams,
    { query: { enabled: !!twinId, queryKey: getGetFeedingSummaryQueryKey(queryParams) } },
  );

  const { data: foods = [], isLoading: foodsLoading } = useListFoodsIntroduced(
    { twinId: twinId ?? 0 },
    { query: { enabled: !!twinId, queryKey: getListFoodsIntroducedQueryKey({ twinId: twinId ?? 0 }) } },
  );

  const createEntry = useCreateFeedingEntry();
  const updateEntry = useUpdateFeedingEntry();
  const deleteEntry = useDeleteFeedingEntry();
  const createFood = useCreateFoodIntroduced();
  const deleteFood = useDeleteFoodIntroduced();

  function invalidateFeeding() {
    qc.invalidateQueries({ queryKey: getListFeedingEntriesQueryKey(queryParams) });
    qc.invalidateQueries({ queryKey: getGetFeedingSummaryQueryKey(queryParams) });
  }

  function invalidateFoods() {
    qc.invalidateQueries({ queryKey: getListFoodsIntroducedQueryKey({ twinId: twinId ?? 0 }) });
  }

  function handleLog(type: FeedingType, details: {
    side?: string | null;
    durationMinutes?: number | null;
    amountMl?: number | null;
    foodName?: string | null;
    notes?: string | null;
  }) {
    if (!twinId) return;
    createEntry.mutate(
      {
        data: {
          twinId,
          feedingType: type,
          time: new Date().toISOString(),
          side: details.side ?? null,
          durationMinutes: details.durationMinutes ?? null,
          amountMl: details.amountMl ?? null,
          foodName: details.foodName ?? null,
          notes: details.notes ?? null,
        },
      },
      {
        onSuccess: () => {
          invalidateFeeding();
          setLogSheetType(null);
        },
      },
    );
  }

  function handleSaveEdit(updates: { feedingType: string; time: string; notes?: string | null }) {
    if (!editingEntry) return;
    updateEntry.mutate(
      { id: editingEntry.id, data: updates },
      {
        onSuccess: () => {
          invalidateFeeding();
          setEditingEntry(null);
        },
      },
    );
  }

  function handleAddFood(data: { twinId: number; foodName: string; category: string; firstIntroduced: string; reaction?: string | null; notes?: string | null }) {
    createFood.mutate(
      { data },
      {
        onSuccess: () => {
          invalidateFoods();
          setShowAddFood(false);
        },
      },
    );
  }

  const activeTwin = twins.find((t) => t.id === twinId);
  const twinColor = (activeTwin as { color?: string } | undefined)?.color ?? "#da5a9f";

  return (
    <Layout>
      <PageHeader title="Feeding Tracker" subtitle="Log every feeding for each twin" />

      {twins.length > 0 && (
        <TwinTabs twins={twins} activeTwinId={twinId} onSelect={setActiveTwinId} />
      )}

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Summary card */}
        {summary && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today's Total</p>
            <p className="text-3xl font-bold text-primary mb-3">{summary.totalFeedings} feedings</p>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div>
                <p className="font-bold text-[#da5a9f]">{summary.breastfeedingCount}</p>
                <p className="text-xs text-muted-foreground">Breast</p>
              </div>
              <div>
                <p className="font-bold text-accent">{summary.bottleCount}</p>
                <p className="text-xs text-muted-foreground">Bottle</p>
              </div>
              <div>
                <p className="font-bold text-secondary">{summary.formulaCount}</p>
                <p className="text-xs text-muted-foreground">Formula</p>
              </div>
              <div>
                <p className="font-bold text-[#b58c5a]">{summary.solidsCount}</p>
                <p className="text-xs text-muted-foreground">Solids</p>
              </div>
            </div>
            {(summary.totalAmountMl > 0 || summary.totalDurationMinutes > 0) && (
              <div className="flex gap-3 pt-2 border-t border-border">
                {summary.totalAmountMl > 0 && (
                  <div className="text-center flex-1">
                    <p className="font-bold text-accent text-sm">{Math.round(summary.totalAmountMl)}ml</p>
                    <p className="text-xs text-muted-foreground">{mlToOz(summary.totalAmountMl)}oz total</p>
                  </div>
                )}
                {summary.totalDurationMinutes > 0 && (
                  <div className="text-center flex-1">
                    <p className="font-bold text-[#da5a9f] text-sm">{summary.totalDurationMinutes} min</p>
                    <p className="text-xs text-muted-foreground">breast time</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick log buttons */}
        <div className="grid grid-cols-2 gap-3">
          {FEEDING_TYPES.map(({ key, label, emoji, color }) => (
            <button
              key={key}
              onClick={() => setLogSheetType(key)}
              disabled={!twinId}
              className="py-5 rounded-2xl text-white font-semibold flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              style={{ backgroundColor: color }}
              data-testid={`button-log-${key}`}
            >
              <span className="text-2xl">{emoji}</span>
              <span>{label}</span>
              <span className="text-xs opacity-80">Tap to log</span>
            </button>
          ))}
        </div>

        {/* Today's log */}
        {isLoading && <Skeleton className="h-24 rounded-2xl" />}

        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Today's Log</p>
            {[...entries].reverse().map((entry) => {
              const ft = FEEDING_TYPES.find((f) => f.key === entry.feedingType);
              const e = entry as typeof entry & {
                side?: string | null;
                durationMinutes?: number | null;
                amountMl?: number | null;
                foodName?: string | null;
              };
              const details: string[] = [];
              if (e.side) details.push(e.side === "left" ? "⬅️ Left" : "Right ➡️");
              if (e.durationMinutes) details.push(formatDuration(e.durationMinutes)!);
              if (e.amountMl) details.push(formatAmount(e.amountMl)!);
              if (e.foodName) details.push(e.foodName);
              if (entry.notes) details.push(entry.notes);

              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  data-testid={`feeding-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                      style={{ backgroundColor: ft?.color ?? "#888" }}
                    >
                      {ft?.emoji ?? "🍼"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ft?.label ?? entry.feedingType}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatTime(entry.time)}
                        {details.length > 0 ? ` · ${details.join(" · ")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingEntry(entry as EditEntry)}
                      className="text-muted-foreground hover:text-primary p-2 transition-colors"
                      data-testid={`edit-feeding-${entry.id}`}
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteEntry.mutate({ id: entry.id }, { onSuccess: invalidateFeeding })}
                      className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                      data-testid={`delete-feeding-${entry.id}`}
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
          <div className="text-center py-6 text-muted-foreground text-sm">
            No feedings logged yet today. Tap a button above to log.
          </div>
        )}

        {!twinId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Set up your twins in Settings first.
          </div>
        )}

        {/* ── Foods Journal ─────────────────────────────────────────────── */}
        {twinId && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setFoodsExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🥗</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Foods Journal</p>
                  <p className="text-xs text-muted-foreground">
                    {foods.length > 0 ? `${foods.length} food${foods.length !== 1 ? "s" : ""} introduced` : "Track foods introduced"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddFood(true);
                  }}
                  className="w-7 h-7 rounded-full bg-[#b58c5a] text-white flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Add food"
                >
                  <Plus size={14} />
                </button>
                {foodsExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </div>
            </button>

            {foodsExpanded && (
              <div className="border-t border-border">
                {foodsLoading && <div className="p-4"><Skeleton className="h-16 rounded-xl" /></div>}
                {!foodsLoading && foods.length === 0 && (
                  <div className="py-6 text-center text-muted-foreground text-sm px-4">
                    No foods logged yet. Tap <strong>+</strong> to add the first food your twin tried!
                  </div>
                )}
                {foods.length > 0 && (
                  <div className="divide-y divide-border">
                    {foods.map((food) => {
                      const f = food as typeof food & { reaction?: string | null };
                      return (
                        <div key={food.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-[#b58c5a]/10 flex items-center justify-center text-base flex-shrink-0">
                            {categoryEmoji(food.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold">{food.foodName}</p>
                              {reactionBadge(f.reaction)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(food.firstIntroduced).toLocaleDateString([], { month: "short", day: "numeric" })}
                              {" · "}
                              <span className="capitalize">{food.category}</span>
                              {food.notes ? ` · ${food.notes}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteFood.mutate({ id: food.id }, { onSuccess: invalidateFoods })}
                            className="text-muted-foreground hover:text-destructive p-2 transition-colors flex-shrink-0"
                            aria-label="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sheets */}
      {logSheetType && (
        <LogFeedingSheet
          feedingType={logSheetType}
          onClose={() => setLogSheetType(null)}
          onLog={(details) => handleLog(logSheetType, details)}
          isPending={createEntry.isPending}
        />
      )}

      {editingEntry && (
        <EditFeedingSheet
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEdit}
          isPending={updateEntry.isPending}
        />
      )}

      {showAddFood && twinId && (
        <AddFoodSheet
          twinId={twinId}
          onClose={() => setShowAddFood(false)}
          onSave={handleAddFood}
          isPending={createFood.isPending}
        />
      )}
    </Layout>
  );
}
