/**
 * Seed script: create App Store reviewer account
 *
 * Creates appreview@allaboutwins.com in Clerk, then seeds the database with:
 *   - Completed onboarding
 *   - Twin A (Ava) + Twin B (Mia)
 *   - 7 days of sleep, feeding, and diaper entries
 *   - 14-day trial plan (active)
 *
 * Run: pnpm --filter @workspace/scripts run seed-reviewer
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const REVIEWER_EMAIL = "appreview@allaboutwins.com";
const REVIEWER_PASSWORD = "TwinTrack2026!";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

// ── Clerk user creation ──────────────────────────────────────────────────────
async function clerkRequest(path: string, method: string, body?: object) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Clerk API ${method} ${path} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

async function getOrCreateClerkUser(): Promise<string> {
  // Check if user already exists
  const search = await clerkRequest(
    `/users?email_address=${encodeURIComponent(REVIEWER_EMAIL)}`,
    "GET"
  ) as unknown as Array<{ id: string }>;

  if (Array.isArray(search) && search.length > 0) {
    const userId = search[0].id;
    console.log(`✓ Clerk user already exists: ${userId}`);
    return userId;
  }

  // Create new user
  const user = await clerkRequest("/users", "POST", {
    email_address: [REVIEWER_EMAIL],
    password: REVIEWER_PASSWORD,
    first_name: "App",
    last_name: "Reviewer",
    skip_password_checks: true,
    skip_password_requirement: false,
  }) as { id: string };

  console.log(`✓ Clerk user created: ${user.id}`);
  return user.id;
}

// ── Database seed ────────────────────────────────────────────────────────────
function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedDatabase(userId: string) {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // ── 1. Onboarding ────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO onboarding (
       user_id, parent_status, multiple_type, baby_age_group,
       biggest_challenge, feature_interest, discovery_source, email,
       newsletter_consent, completed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id) DO UPDATE SET completed_at = EXCLUDED.completed_at`,
    [
      userId,
      "parent",
      "twins",
      "0-6 months",
      "sleep",
      "sleep_tracking",
      "instagram",
      REVIEWER_EMAIL,
      true,
      new Date(),
    ]
  );
  console.log("✓ Onboarding seeded");

  // ── 2. Twin A + Twin B ───────────────────────────────────────────────────
  const twinAResult = await pool.query(
    `INSERT INTO twins (user_id, label, name, gender, birthdate, color_theme)
     VALUES ($1, 'Twin A', 'Ava', 'female', '2024-09-15', '#e91e8c')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId]
  );

  let twinAId: number;
  if (twinAResult.rows.length === 0) {
    const existing = await pool.query(
      `SELECT id FROM twins WHERE user_id=$1 AND label='Twin A' LIMIT 1`,
      [userId]
    );
    twinAId = existing.rows[0].id;
    console.log(`✓ Twin A already exists (id=${twinAId})`);
  } else {
    twinAId = twinAResult.rows[0].id;
    console.log(`✓ Twin A created (id=${twinAId})`);
  }

  const twinBResult = await pool.query(
    `INSERT INTO twins (user_id, label, name, gender, birthdate, color_theme)
     VALUES ($1, 'Twin B', 'Mia', 'female', '2024-09-15', '#2e818c')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId]
  );

  let twinBId: number;
  if (twinBResult.rows.length === 0) {
    const existing = await pool.query(
      `SELECT id FROM twins WHERE user_id=$1 AND label='Twin B' LIMIT 1`,
      [userId]
    );
    twinBId = existing.rows[0].id;
    console.log(`✓ Twin B already exists (id=${twinBId})`);
  } else {
    twinBId = twinBResult.rows[0].id;
    console.log(`✓ Twin B created (id=${twinBId})`);
  }

  // ── 3. User plan — 14-day trial ──────────────────────────────────────────
  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await pool.query(
    `INSERT INTO user_plans (
       user_id, user_email, plan, status,
       trial_started_at, trial_ends_at, is_founding_mom,
       created_at, updated_at
     ) VALUES ($1,$2,'free','trial',$3,$4,false,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       status = 'trial',
       trial_started_at = EXCLUDED.trial_started_at,
       trial_ends_at = EXCLUDED.trial_ends_at,
       updated_at = NOW()`,
    [userId, REVIEWER_EMAIL, trialStart, trialEnd]
  );
  console.log("✓ User plan seeded (14-day trial)");

  // ── 4. Sleep entries — 7 days ────────────────────────────────────────────
  // Clear any existing reviewer sleep data first
  await pool.query(
    `DELETE FROM sleep_entries WHERE twin_id IN ($1, $2)`,
    [twinAId, twinBId]
  );

  type SleepRow = [number, string, Date, Date, number];
  const sleepRows: SleepRow[] = [];

  for (let day = 6; day >= 0; day--) {
    for (const twinId of [twinAId, twinBId]) {
      // Night sleep (from previous night into this day)
      const nightStart = daysAgo(day + 1, 20, 30);
      const nightEnd = daysAgo(day, 5, 45);
      sleepRows.push([twinId, "night", nightStart, nightEnd, 435]);

      // Morning nap
      const nap1Start = daysAgo(day, 9, 0);
      const nap1End = daysAgo(day, 10, 15);
      sleepRows.push([twinId, "nap", nap1Start, nap1End, 75]);

      // Afternoon nap
      const nap2Start = daysAgo(day, 13, 30);
      const nap2End = daysAgo(day, 14, 45);
      sleepRows.push([twinId, "nap", nap2Start, nap2End, 75]);
    }
  }

  for (const [twinId, type, startTime, endTime, duration] of sleepRows) {
    await pool.query(
      `INSERT INTO sleep_entries (twin_id, type, start_time, end_time, duration_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [twinId, type, startTime, endTime, duration]
    );
  }
  console.log(`✓ Sleep entries seeded (${sleepRows.length} entries)`);

  // ── 5. Feeding entries — 7 days ──────────────────────────────────────────
  await pool.query(
    `DELETE FROM feeding_entries WHERE twin_id IN ($1, $2)`,
    [twinAId, twinBId]
  );

  const feedingTypes = ["breastfeeding", "bottle", "formula", "breastfeeding", "bottle", "breastfeeding", "bottle"];
  type FeedingRow = [number, string, string | null, number | null, Date];

  const feedingRows: FeedingRow[] = [];

  for (let day = 6; day >= 0; day--) {
    const hours = [6, 9, 12, 15, 18, 21, 23];
    for (let i = 0; i < hours.length; i++) {
      for (const twinId of [twinAId, twinBId]) {
        const fType = feedingTypes[i % feedingTypes.length];
        const side = fType === "breastfeeding" ? (i % 2 === 0 ? "left" : "right") : null;
        const duration = fType === "breastfeeding" ? 15 : null;
        const feedTime = daysAgo(day, hours[i], i * 3 % 30);
        feedingRows.push([twinId, fType, side, duration, feedTime]);
      }
    }
  }

  for (const [twinId, feedingType, side, durationMinutes, time] of feedingRows) {
    await pool.query(
      `INSERT INTO feeding_entries (twin_id, feeding_type, side, duration_minutes, time)
       VALUES ($1, $2, $3, $4, $5)`,
      [twinId, feedingType, side, durationMinutes, time]
    );
  }
  console.log(`✓ Feeding entries seeded (${feedingRows.length} entries)`);

  // ── 6. Diaper entries — 7 days ───────────────────────────────────────────
  await pool.query(
    `DELETE FROM diaper_entries WHERE twin_id IN ($1, $2)`,
    [twinAId, twinBId]
  );

  const diaperTypes = ["wet", "dirty", "wet", "mixed", "wet", "wet", "dirty", "wet", "wet"];
  type DiaperRow = [number, string, Date];
  const diaperRows: DiaperRow[] = [];

  for (let day = 6; day >= 0; day--) {
    const hours = [6, 8, 10, 13, 15, 18, 20, 22, 23];
    for (let i = 0; i < hours.length; i++) {
      for (const twinId of [twinAId, twinBId]) {
        const dType = diaperTypes[i % diaperTypes.length];
        const dTime = daysAgo(day, hours[i], i * 5 % 50);
        diaperRows.push([twinId, dType, dTime]);
      }
    }
  }

  for (const [twinId, type, time] of diaperRows) {
    await pool.query(
      `INSERT INTO diaper_entries (twin_id, type, time)
       VALUES ($1, $2, $3)`,
      [twinId, type, time]
    );
  }
  console.log(`✓ Diaper entries seeded (${diaperRows.length} entries)`);

  await pool.end();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱 Seeding App Store reviewer account…\n");
  const userId = await getOrCreateClerkUser();
  await seedDatabase(userId);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Reviewer account ready!

  Email:    ${REVIEWER_EMAIL}
  Password: ${REVIEWER_PASSWORD}
  Clerk ID: ${userId}

  Twins:    Twin A "Ava" + Twin B "Mia"
  Plan:     14-day trial (active)
  Data:     7 days of sleep / feeding / diapers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
