import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useListTwins,
  useCreateTwin,
  useUpdateTwin,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Save, LogOut, Video, ChevronRight, Trash2, AlertTriangle } from "lucide-react";

const COLOR_OPTIONS = [
  "#da5a9f",
  "#2e818c",
  "#83b8c0",
  "#9b59b6",
  "#e67e22",
  "#27ae60",
  "#e74c3c",
  "#3498db",
];

const GENDER_OPTIONS = ["Girl", "Boy", "Prefer not to say"];

type TwinFormData = {
  name: string;
  gender: string;
  birthdate: string;
  colorTheme: string;
};

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: twins = [], isLoading } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const createTwin = useCreateTwin();
  const updateTwin = useUpdateTwin();

  const defaultForm: TwinFormData = { name: "", gender: "", birthdate: "", colorTheme: "#da5a9f" };
  const [formA, setFormA] = useState<TwinFormData>(defaultForm);
  const [formB, setFormB] = useState<TwinFormData>({ ...defaultForm, colorTheme: "#2e818c" });
  const [savedA, setSavedA] = useState(false);
  const [savedB, setSavedB] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const twinA = twins.find((t) => t.label === "Twin A");
  const twinB = twins.find((t) => t.label === "Twin B");

  useEffect(() => {
    if (twinA) {
      setFormA({
        name: twinA.name,
        gender: twinA.gender ?? "",
        birthdate: twinA.birthdate ?? "",
        colorTheme: twinA.colorTheme,
      });
    }
    if (twinB) {
      setFormB({
        name: twinB.name,
        gender: twinB.gender ?? "",
        birthdate: twinB.birthdate ?? "",
        colorTheme: twinB.colorTheme,
      });
    }
  }, [twins.length]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) });
  }

  function saveTwin(label: "Twin A" | "Twin B", form: TwinFormData, existing?: typeof twinA) {
    if (!user?.id) return;
    const setSaved = label === "Twin A" ? setSavedA : setSavedB;

    if (existing) {
      updateTwin.mutate(
        {
          id: existing.id,
          data: {
            name: form.name || null,
            gender: form.gender || null,
            birthdate: form.birthdate || null,
            colorTheme: form.colorTheme,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        },
      );
    } else {
      createTwin.mutate(
        {
          data: {
            userId: user.id,
            label,
            name: form.name || label,
            gender: form.gender || null,
            birthdate: form.birthdate || null,
            colorTheme: form.colorTheme,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        },
      );
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== "delete") return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setDeleteError(body.error ?? "Something went wrong. Please try again.");
        setIsDeleting(false);
        return;
      }
      await signOut();
      setLocation("/");
    } catch {
      setDeleteError("Could not connect to the server. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <Layout>
      <PageHeader title="Settings" subtitle="Manage your twin profiles" />

      <div className="px-4 space-y-6 pb-4">
        {/* Account */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{user?.fullName || user?.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-muted-foreground">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors font-medium"
              data-testid="button-sign-out"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content Management */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Library</p>
          </div>
          <button
            onClick={() => setLocation("/admin/videos")}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
            data-testid="button-video-admin"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Video size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Add Videos to Learn</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import YouTube or other videos to the library</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Twin A */}
        <TwinProfileForm
          label="Twin A"
          form={formA}
          onChange={setFormA}
          onSave={() => saveTwin("Twin A", formA, twinA)}
          saved={savedA}
          isPending={createTwin.isPending || updateTwin.isPending}
        />

        {/* Twin B */}
        <TwinProfileForm
          label="Twin B"
          form={formB}
          onChange={setFormB}
          onSave={() => saveTwin("Twin B", formB, twinB)}
          saved={savedB}
          isPending={createTwin.isPending || updateTwin.isPending}
        />

        {/* Delete Account */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Danger Zone</p>
          </div>

          {!showDeleteConfirm ? (
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently removes all your data</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
                data-testid="button-delete-account"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4 border border-red-100">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-700">This cannot be undone</p>
                  <p className="text-xs text-red-500 mt-1 leading-relaxed">
                    All your twins' data — sleep logs, feeding records, diapers, routines, and milestones — will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Type <span className="text-red-500 font-bold">delete</span> to confirm
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete"
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-red-300 transition-all"
                  data-testid="input-delete-confirm"
                />
              </div>

              {deleteError && (
                <p className="text-xs text-red-500 font-medium">{deleteError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(null); }}
                  className="py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || isDeleting}
                  className="py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                  data-testid="button-confirm-delete"
                >
                  {isDeleting ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TwinProfileForm({
  label,
  form,
  onChange,
  onSave,
  saved,
  isPending,
}: {
  label: string;
  form: TwinFormData;
  onChange: (f: TwinFormData) => void;
  onSave: () => void;
  saved: boolean;
  isPending: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div
        className="px-5 py-4 border-b border-border flex items-center gap-3"
        style={{ backgroundColor: form.colorTheme + "15" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: form.colorTheme }}
        >
          {(form.name || label).charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{form.name || "Unnamed"}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder={`${label} name...`}
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid={`input-${label.replace(" ", "-").toLowerCase()}-name`}
          />
        </Field>

        <Field label="Gender">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => onChange({ ...form, gender: g })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  form.gender === g ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`gender-${g.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Birthdate">
          <input
            type="date"
            value={form.birthdate}
            onChange={(e) => onChange({ ...form, birthdate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid={`input-${label.replace(" ", "-").toLowerCase()}-birthdate`}
          />
        </Field>

        <Field label="Color Theme">
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...form, colorTheme: c })}
                className={`w-9 h-9 rounded-full transition-all active:scale-90 ${
                  form.colorTheme === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                }`}
                style={{ backgroundColor: c }}
                data-testid={`color-${c}`}
              />
            ))}
          </div>
        </Field>

        <button
          onClick={onSave}
          disabled={isPending}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            saved ? "bg-green-500 text-white" : "bg-primary text-white"
          } disabled:opacity-50`}
          data-testid={`button-save-${label.replace(" ", "-").toLowerCase()}`}
        >
          <Save size={16} />
          {saved ? "Saved!" : isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
