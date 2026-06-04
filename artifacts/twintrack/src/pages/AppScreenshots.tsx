import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// 414×896px CSS viewport → at 3× device pixel ratio = 1242×2688px exactly (App Store required)
const W = 414;
const H = 896;

const brand = "#e91e8c";
const brandDark = "#9c27b0";

function Slide({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div
      className="screenshot-slide"
      style={{
        width: W, height: H, background: bg, position: "relative",
        overflow: "hidden", fontFamily: "'Quicksand', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Headline({ line1, line2, light = false }: { line1: string; line2?: string; light?: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "52px 28px 0", zIndex: 2 }}>
      <p style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1.15, margin: 0, textShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
        {line1}
      </p>
      {line2 && (
        <p style={{ fontSize: 38, fontWeight: 800, color: light ? "rgba(255,255,255,0.9)" : "#ffe0f7", lineHeight: 1.15, margin: 0 }}>
          {line2}
        </p>
      )}
    </div>
  );
}

function SubLine({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.82)", textAlign: "center", padding: "10px 36px 0", margin: 0, lineHeight: 1.45 }}>
      {text}
    </p>
  );
}

function Branding() {
  return (
    <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 22 }}>💕</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>TwinTrack</span>
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", margin: 0, fontWeight: 600 }}>For twin parents, by twin parents</p>
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.97)", borderRadius: 24, padding: "18px 18px",
      boxShadow: "0 12px 48px rgba(0,0,0,0.22)", width: W - 48,
      ...style,
    }}>
      {children}
    </div>
  );
}

function MetricPill({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ width: 40, height: 40, borderRadius: 14, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {icon}
      </div>
      <span style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

// ── 1. DASHBOARD ────────────────────────────────────────────────────────────
function S1() {
  return (
    <Slide bg={`linear-gradient(160deg, ${brand} 0%, ${brandDark} 100%)`}>
      <Headline line1="Your twins," line2="at a glance 💕" />
      <SubLine text="Sleep, feeding, diapers — live for both twins on one screen" />
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {[
          { name: "Twin A · Ava", color: "#e91e8c", sleep: "3h 40m", feeds: "5", diapers: "4", timer: "1:22:14", active: true },
          { name: "Twin B · Mia", color: "#2e818c", sleep: "4h 10m", feeds: "6", diapers: "5", timer: null, active: false },
        ].map((t) => (
          <Card key={t.name} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 14, background: t.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {t.color === "#e91e8c" ? "👧" : "👧🏻"}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>{t.name}</p>
                  {t.active ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>Napping · {t.timer}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>Awake</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <MetricPill icon="😴" label="Sleep" value={t.sleep} color="#6366f1" />
              <MetricPill icon="🍼" label="Feeds" value={t.feeds} color="#e91e8c" />
              <MetricPill icon="🌼" label="Diapers" value={t.diapers} color="#2e818c" />
            </div>
          </Card>
        ))}
      </div>
      <Branding />
    </Slide>
  );
}

// ── 2. SLEEP ─────────────────────────────────────────────────────────────────
function S2() {
  return (
    <Slide bg="linear-gradient(160deg, #0f2044 0%, #1e3a5f 60%, #163163 100%)">
      <Headline line1="Track every nap," line2="every night 😴" />
      <SubLine text="Tap once to start. Stop when they wake. It's that simple." />
      <div style={{ marginTop: 28, alignItems: "center", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 4, gap: 4 }}>
          {["Twin A · Ava", "Twin B · Mia"].map((t, i) => (
            <div key={t} style={{
              padding: "8px 24px", borderRadius: 12, fontWeight: 700, fontSize: 13,
              background: i === 0 ? brand : "transparent",
              color: i === 0 ? "#fff" : "rgba(255,255,255,0.6)",
            }}>{t}</div>
          ))}
        </div>
        <Card style={{ padding: "24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Napping now</div>
          <div style={{ fontSize: 58, fontWeight: 800, color: "#1a1a2e", letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>1:22:14</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Started at 2:15 PM</div>
          <button style={{
            width: "100%", padding: "15px", borderRadius: 18, border: "none",
            background: "linear-gradient(135deg, #e91e8c, #9c27b0)", color: "#fff",
            fontSize: 17, fontWeight: 800, cursor: "pointer",
          }}>⏹ Stop Sleep Timer</button>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>4h 30m</div>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>Total today</div>
            </div>
            <div style={{ width: 1, background: "#f0f0f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>3</div>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>Naps today</div>
            </div>
            <div style={{ width: 1, background: "#f0f0f0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>6h</div>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>Night sleep</div>
            </div>
          </div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 3. FEEDING ───────────────────────────────────────────────────────────────
function S3() {
  return (
    <Slide bg="linear-gradient(160deg, #2e818c 0%, #0f3d44 100%)">
      <Headline line1="Log a feed" line2="in one tap 🍼" />
      <SubLine text="Breast, bottle, formula, or solids — tracked separately for each twin" />
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card>
          <div style={{ display: "flex", background: "#f6f6f6", borderRadius: 14, padding: 3, gap: 3, marginBottom: 16 }}>
            {["Ava", "Mia"].map((n, i) => (
              <div key={n} style={{
                flex: 1, padding: "8px 0", textAlign: "center", borderRadius: 11,
                background: i === 0 ? "#2e818c" : "transparent",
                color: i === 0 ? "#fff" : "#888", fontWeight: 700, fontSize: 13,
              }}>{n}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "🤱", label: "Breast", color: "#e91e8c" },
              { icon: "🍼", label: "Bottle", color: "#2e818c" },
              { icon: "🥛", label: "Formula", color: "#7c3aed" },
              { icon: "🥣", label: "Solids", color: "#f59e0b" },
            ].map((b, i) => (
              <button key={b.label} style={{
                padding: "18px 8px", borderRadius: 18, border: `2px solid ${i === 1 ? b.color : "#eee"}`,
                background: i === 1 ? b.color + "12" : "#fafafa",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer",
              }}>
                <span style={{ fontSize: 30 }}>{b.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: i === 1 ? b.color : "#555" }}>{b.label}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Today's feedings</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e" }}>7 <span style={{ fontSize: 14, color: "#aaa" }}>feedings</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Last fed</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2e818c" }}>2h ago</div>
            </div>
          </div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 4. MEMORIES / MILESTONES ─────────────────────────────────────────────────
function S4() {
  const milestones = [
    { emoji: "😁", title: "First Smile", date: "Mar 15", twin: "Ava", color: "#e91e8c" },
    { emoji: "🗣️", title: "First Word", date: "Jun 2", twin: "Mia", color: "#2e818c" },
    { emoji: "👣", title: "First Steps", date: "Aug 19", twin: "Both 💕", color: "#9c27b0" },
  ];
  return (
    <Slide bg="linear-gradient(160deg, #ff6b9d 0%, #d4287d 60%, #a1145f 100%)">
      <Headline line1="Capture every" line2="milestone 💝" />
      <SubLine text="Save photos, notes, and memories — organized by twin and date" />
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {milestones.map((m) => (
          <Card key={m.title} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: m.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              {m.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{m.title}</div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginTop: 2 }}>{m.twin} · {m.date}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🖼️</div>
          </Card>
        ))}
        <Card style={{ padding: "14px 18px", textAlign: "center", border: "2px dashed #ffd0e8" }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>✨</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#d4287d" }}>Add a new milestone</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Tap to record a special moment</div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 5. TWIN AI ───────────────────────────────────────────────────────────────
function S5() {
  return (
    <Slide bg="linear-gradient(160deg, #5b21b6 0%, #2e1065 100%)">
      <Headline line1="Ask anything" line2="about your twins ✨" />
      <SubLine text="Instant expert guidance — sleep schedules, feeding tips, development" />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <Card style={{ padding: "16px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Twin AI · Your personal expert</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <div style={{ background: "#5b21b6", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "10px 14px", maxWidth: "75%", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
              My twins wake up at different times. Is that normal?
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg, #e91e8c, #9c27b0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✨</div>
            <div style={{ background: "#f6f0ff", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", flex: 1, fontSize: 13, color: "#333", lineHeight: 1.5 }}>
              Totally normal! Twins often have slightly different sleep rhythms. Try a consistent dual bedtime routine — it usually syncs them within 1–2 weeks 💕
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
            <div style={{ background: "#5b21b6", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "10px 14px", maxWidth: "75%", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
              How long should naps be at 4 months?
            </div>
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", background: "#f6f6f6", borderRadius: 16, padding: "10px 14px" }}>
            <span style={{ flex: 1, fontSize: 13, color: "#aaa" }}>Ask about feeding, sleep, development…</span>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg, #e91e8c, #9c27b0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14 }}>↑</span>
            </div>
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          {["😴 Sleep tips", "🍼 Feeding help", "🧠 Development"].map((tag) => (
            <div key={tag} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 12px", fontSize: 12, color: "#fff", fontWeight: 600 }}>{tag}</div>
          ))}
        </div>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 6. LEARN / ACADEMY ──────────────────────────────────────────────────────
function S6() {
  return (
    <Slide bg="linear-gradient(160deg, #065f46 0%, #022c22 100%)">
      <Headline line1="Learn from the" line2="experts 🎓" />
      <SubLine text="Twins Magazine, Academy courses, and community — all in one place" />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
            <div style={{ width: 64, height: 80, borderRadius: 12, background: "linear-gradient(135deg, #e91e8c, #9c27b0)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>All About</span>
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3 }}>Twins</span>
              <span style={{ fontSize: 20 }}>📚</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Jan 2026</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>📖 Magazine</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.3 }}>All About Twins — Jan / Feb 2026</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Real stories · Expert advice · Community</div>
            </div>
          </div>
          <div style={{ paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>🎓 Academy Course</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #2e818c, #065f46)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>😴</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>Helping Twins Sleep Tight</div>
                <div style={{ fontSize: 12, color: "#888" }}>Sleep · Free preview available</div>
              </div>
            </div>
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8, width: W - 48 }}>
          {[
            { icon: "📖", label: "10 Issues", bg: "#e91e8c" },
            { icon: "🎓", label: "8 Courses", bg: "#2e818c" },
            { icon: "👯", label: "Community", bg: "#9c27b0" },
          ].map((b) => (
            <div key={b.label} style={{ flex: 1, background: b.bg + "22", borderRadius: 16, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 4 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 7. COMMUNITY POLLS ──────────────────────────────────────────────────────
function S7() {
  const opts = [
    { label: "😴 Sleep deprivation", pct: 38, color: "#6366f1" },
    { label: "🍼 Feeding two at once", pct: 27, color: "#e91e8c" },
    { label: "⏰ Finding time for myself", pct: 21, color: "#f59e0b" },
    { label: "📅 Keeping a schedule", pct: 14, color: "#2e818c" },
  ];
  return (
    <Slide bg="linear-gradient(160deg, #c2410c 0%, #7c2d12 100%)">
      <Headline line1="You're not" line2="alone 👯" />
      <SubLine text="Vote on polls and connect with twin parents worldwide" />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Community Poll · 847 votes</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.35, marginBottom: 16 }}>What's your biggest challenge with twins right now?</div>
          {opts.map((o) => (
            <div key={o.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{o.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: o.color }}>{o.pct}%</span>
              </div>
              <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${o.pct}%`, height: "100%", background: o.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 4, textAlign: "center", fontSize: 12, color: "#aaa" }}>Tap an option to cast your vote</div>
        </Card>
        <Card style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>💬</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>Share your story</div>
            <div style={{ fontSize: 12, color: "#888" }}>Ask questions · Get support · Connect</div>
          </div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 8. STATS ─────────────────────────────────────────────────────────────────
function S8() {
  const bars = [
    { day: "Mon", sleep: 82 },
    { day: "Tue", sleep: 75 },
    { day: "Wed", sleep: 90 },
    { day: "Thu", sleep: 68 },
    { day: "Fri", sleep: 85 },
    { day: "Sat", sleep: 92 },
    { day: "Sun", sleep: 78 },
  ];
  return (
    <Slide bg="linear-gradient(160deg, #0369a1 0%, #012a4a 100%)">
      <Headline line1="Understand your" line2="twins' patterns 📊" />
      <SubLine text="Track trends, spot changes, and feel confident every day" />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Sleep Hours · This Week</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
            {bars.map((b) => (
              <div key={b.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: b.sleep * 0.82 + "px", background: "linear-gradient(180deg, #0284c7, #0369a1)", borderRadius: "4px 4px 0 0" }} />
                <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>{b.day}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: W - 48 }}>
          {[
            { icon: "😴", label: "Avg sleep", value: "13.8h", color: "#0284c7" },
            { icon: "🍼", label: "Avg feeds", value: "7.4", color: "#e91e8c" },
            { icon: "🌼", label: "Avg diapers", value: "9.2", color: "#2e818c" },
          ].map((s) => (
            <Card key={s.label} style={{ padding: "14px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>{s.label}</div>
            </Card>
          ))}
        </div>
        <Card style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>7-day trend</div>
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>↑ Sleep improving</div>
            </div>
            <div style={{ fontSize: 28 }}>📈</div>
          </div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 9. CAREGIVER ACCESS ──────────────────────────────────────────────────────
function S9() {
  const caregivers = [
    { icon: "👩", name: "Mom (You)", role: "Owner", color: "#e91e8c" },
    { icon: "👨", name: "Dad · James", role: "Caregiver", color: "#2e818c" },
    { icon: "👵", name: "Grandma · Sue", role: "Caregiver", color: "#9c27b0" },
  ];
  return (
    <Slide bg="linear-gradient(160deg, #be185d 0%, #831843 100%)">
      <Headline line1="Share with your" line2="whole village 👨‍👩‍👧" />
      <SubLine text="Invite Dad, Grandma, or your nanny — everyone stays in sync" />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Your care team</div>
          {caregivers.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ width: 44, height: 44, borderRadius: 16, background: c.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{c.role}</div>
              </div>
              <div style={{ padding: "4px 10px", borderRadius: 20, background: c.color + "18", fontSize: 11, fontWeight: 700, color: c.color }}>Active</div>
            </div>
          ))}
          <button style={{ width: "100%", marginTop: 14, padding: "13px", borderRadius: 16, border: "2px dashed #ffd0e0", background: "transparent", color: "#be185d", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Invite a caregiver
          </button>
        </Card>
        <Card style={{ padding: "14px 18px", background: "#fff8fb" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#be185d", marginBottom: 4 }}>💕 Premium feature</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>Caregiver access is included with TwinTrack Premium — everyone sees the same real-time data.</div>
        </Card>
      </div>
      <Branding />
    </Slide>
  );
}

// ── 10. PREMIUM / FOUNDING MOMS ──────────────────────────────────────────────
function S10() {
  const features = [
    { icon: "✨", text: "Unlimited Twin AI conversations" },
    { icon: "👨‍👩‍👧‍👦", text: "Caregiver Access" },
    { icon: "📖", text: "Full Twins Magazine library" },
    { icon: "🎓", text: "Twins Academy expert courses" },
    { icon: "💝", text: "Premium memory cards" },
    { icon: "🚀", text: "All future features, always" },
  ];
  return (
    <Slide bg="linear-gradient(160deg, #e91e8c 0%, #7c3aed 100%)">
      <Headline line1="Join our" line2="Founding Moms 💕" light />
      <SubLine text="Lock in $39/year forever — before we launch to the public" />
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Monthly", price: "$5.99", sub: "/month", highlight: false },
              { label: "Founding 💕", price: "$39", sub: "/year", highlight: true },
              { label: "Annual", price: "$49", sub: "/year", highlight: false },
            ].map((p) => (
              <div key={p.label} style={{
                flex: 1, padding: "10px 6px", borderRadius: 16, textAlign: "center",
                background: p.highlight ? "linear-gradient(135deg, #e91e8c, #9c27b0)" : "#f6f6f6",
                border: p.highlight ? "none" : "2px solid #f0f0f0",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: p.highlight ? "rgba(255,255,255,0.8)" : "#888", marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: p.highlight ? "#fff" : "#1a1a2e" }}>{p.price}</div>
                <div style={{ fontSize: 10, color: p.highlight ? "rgba(255,255,255,0.7)" : "#aaa" }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 12, borderTop: "1px solid #f5f5f5" }}>
            {features.map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <span style={{ fontSize: 16, width: 22 }}>{f.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 18, padding: "12px 20px", textAlign: "center", width: W - 60 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>🎉 Founding rate locked forever</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Never pay more — even as prices go up</div>
        </div>
      </div>
      <Branding />
    </Slide>
  );
}

const SCREENS = [
  { id: 1, label: "Home Dashboard", component: S1 },
  { id: 2, label: "Sleep Tracking", component: S2 },
  { id: 3, label: "Feeding Tracking", component: S3 },
  { id: 4, label: "Memories", component: S4 },
  { id: 5, label: "Twin AI", component: S5 },
  { id: 6, label: "Learn / Academy", component: S6 },
  { id: 7, label: "Community Polls", component: S7 },
  { id: 8, label: "Stats", component: S8 },
  { id: 9, label: "Caregiver Access", component: S9 },
  { id: 10, label: "Premium / Founding Moms", component: S10 },
];

export default function AppScreenshots() {
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const Screen = SCREENS[current].component;

  return (
    <div style={{ minHeight: "100dvh", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Quicksand', sans-serif" }}>
      {/* Top controls bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100, background: "#1a1a1a",
        borderBottom: "1px solid #2a2a2a", width: "100%", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0 || showAll}
          style={{ background: "#333", border: "none", color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer", opacity: (current === 0 || showAll) ? 0.3 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, minWidth: 190, textAlign: "center" }}>
          {showAll ? "All 10 Screenshots" : `${current + 1} / 10 · ${SCREENS[current].label}`}
        </span>
        <button
          onClick={() => setCurrent((c) => Math.min(SCREENS.length - 1, c + 1))}
          disabled={current === SCREENS.length - 1 || showAll}
          style={{ background: "#333", border: "none", color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer", opacity: (current === SCREENS.length - 1 || showAll) ? 0.3 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{ marginLeft: "auto", background: showAll ? brand : "#333", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          {showAll ? "Single view" : "Show all 10"}
        </button>
      </div>

      {/* Export instructions */}
      <div style={{ background: "#1e1e1e", borderBottom: "1px solid #2a2a2a", width: "100%", padding: "10px 20px", color: "#888", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
        <strong style={{ color: "#e91e8c" }}>How to export at 1242×2688px:</strong>{" "}
        Chrome DevTools (F12) → Toggle device toolbar → Custom size{" "}
        <strong style={{ color: "#fff", background: "#2a2a2a", padding: "2px 6px", borderRadius: 6 }}>414 × 896</strong>{" "}
        → Right-click the slide → <strong style={{ color: "#fff" }}>Capture node screenshot</strong> → saves exact PNG ✓
      </div>

      {/* Screenshot canvas area */}
      <div style={{ padding: "28px 0 60px", display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
        {showAll ? (
          SCREENS.map(({ id, label, component: C }) => (
            <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{id}. {label}</div>
              <C />
            </div>
          ))
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Screen />
            {/* Dot nav */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {SCREENS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  style={{
                    width: i === current ? 24 : 8, height: 8, borderRadius: 4,
                    background: i === current ? brand : "#444",
                    border: "none", cursor: "pointer", transition: "all 0.2s",
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ color: "#555", fontSize: 11 }}>← → buttons above or dots to navigate</div>
          </div>
        )}
      </div>
    </div>
  );
}
