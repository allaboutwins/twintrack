import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./lib/logger";

const connectors = new ReplitConnectors();

const ONBOARDING_RANGE = "Onboarding!A:N";
const ONBOARDING_HEADERS = [
  "Signup Date",
  "User ID",
  "Family Type",
  "Baby Age Group",
  "Premature/NICU",
  "Gestational Age (wks)",
  "Wants Adjusted Age",
  "Biggest Challenge",
  "Feature Interest",
  "Discovery Source",
  "Instagram Handle",
  "Ambassador",
  "Onboarding Completed",
  "Created At",
];

async function ensureHeaders(spreadsheetId: string, sheetName: string, headers: string[]): Promise<void> {
  try {
    const checkRes = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1:A1")}`,
      { method: "GET" },
    );
    const checkData = await checkRes.json() as { values?: string[][] };
    if (!checkData.values?.length) {
      await connectors.proxy(
        "google-sheet",
        `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1")}:append?valueInputOption=USER_ENTERED`,
        { method: "POST", body: JSON.stringify({ values: [headers] }) },
      );
      logger.info({ sheetName }, "sheets: headers written");
    }
  } catch (err) {
    logger.warn({ err }, "sheets: ensureHeaders failed");
  }
}

export async function appendOnboardingRow(data: {
  userId: string;
  multipleType?: string | null;
  babyAgeGroup?: string | null;
  isPremature?: boolean | null;
  gestationalAgeWeeks?: number | null;
  hadNicu?: boolean | null;
  wantsAdjustedAge?: boolean | null;
  biggestChallenge?: string | null;
  featureInterest?: string | null;
  discoverySource?: string | null;
  instagramHandle?: string | null;
  isAmbassador?: boolean | null;
  completedAt?: string | null;
  createdAt: string;
}): Promise<void> {
  // Read env var lazily so production picks it up after deploy
  const spreadsheetId = process.env.GOOGLE_SHEET_ID ?? "";
  if (!spreadsheetId) {
    logger.warn("sheets: GOOGLE_SHEET_ID not set — skipping sync. Redeploy after setting the env var.");
    return;
  }
  try {
    await ensureHeaders(spreadsheetId, "Onboarding", ONBOARDING_HEADERS);
    const row = [
      new Date().toISOString(),
      data.userId,
      data.multipleType ?? "",
      data.babyAgeGroup ?? "",
      data.isPremature != null ? (data.isPremature ? "Yes" : "No") : "",
      data.gestationalAgeWeeks ?? "",
      data.wantsAdjustedAge != null ? (data.wantsAdjustedAge ? "Yes" : "No") : "",
      data.biggestChallenge ?? "",
      data.featureInterest ?? "",
      data.discoverySource ?? "",
      data.instagramHandle ?? "",
      data.isAmbassador != null ? (data.isAmbassador ? "Yes 💕" : "No") : "",
      data.completedAt ?? "",
      data.createdAt,
    ];
    const res = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ONBOARDING_RANGE)}:append?valueInputOption=USER_ENTERED`,
      { method: "POST", body: JSON.stringify({ values: [row] }) },
    );
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "sheets: append failed");
    } else {
      logger.info({ userId: data.userId }, "sheets: onboarding row appended OK");
    }
  } catch (err) {
    logger.warn({ err }, "sheets: appendOnboardingRow error");
  }
}
