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
  logger.info({ spreadsheetId, sheetName }, "sheets: checking headers");
  try {
    const checkRes = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1:A1")}`,
      { method: "GET" },
    );
    const checkData = await checkRes.json() as { values?: string[][]; error?: { message: string } };
    if (checkData.error) {
      logger.warn({ error: checkData.error, spreadsheetId, sheetName }, "sheets: header check returned error");
      return;
    }
    if (!checkData.values?.length) {
      logger.info({ sheetName }, "sheets: writing headers (sheet is empty)");
      const writeRes = await connectors.proxy(
        "google-sheet",
        `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + "!A1")}:append?valueInputOption=USER_ENTERED`,
        { method: "POST", body: JSON.stringify({ values: [headers] }) },
      );
      const writeData = await writeRes.json() as { error?: { message: string } };
      if (writeData.error) {
        logger.warn({ error: writeData.error }, "sheets: header write failed");
      } else {
        logger.info({ sheetName }, "sheets: headers written OK");
      }
    } else {
      logger.info({ sheetName }, "sheets: headers already present");
    }
  } catch (err) {
    logger.warn({ err }, "sheets: ensureHeaders threw");
  }
}

export type OnboardingRowData = {
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
};

export async function appendOnboardingRow(data: OnboardingRowData): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID ?? "";
  const tabName = "Onboarding";

  logger.info(
    { userId: data.userId, spreadsheetId: spreadsheetId || "(not set)", tab: tabName },
    "sheets: appendOnboardingRow called",
  );

  if (!spreadsheetId) {
    logger.warn("sheets: GOOGLE_SHEET_ID env var is not set — skipping sync. Set it and redeploy.");
    return;
  }

  try {
    await ensureHeaders(spreadsheetId, tabName, ONBOARDING_HEADERS);

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

    logger.info({ userId: data.userId, range: ONBOARDING_RANGE }, "sheets: appending row");

    const res = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ONBOARDING_RANGE)}:append?valueInputOption=USER_ENTERED`,
      { method: "POST", body: JSON.stringify({ values: [row] }) },
    );

    const body = await res.json() as {
      updates?: { updatedRange?: string; updatedRows?: number };
      error?: { code?: number; message?: string; status?: string };
    };

    if (!res.ok || body.error) {
      logger.error(
        { status: res.status, error: body.error, userId: data.userId, spreadsheetId },
        "sheets: append FAILED",
      );
    } else {
      logger.info(
        { userId: data.userId, updatedRange: body.updates?.updatedRange, updatedRows: body.updates?.updatedRows },
        "sheets: row appended OK ✓",
      );
    }
  } catch (err) {
    logger.error({ err, userId: data.userId, spreadsheetId }, "sheets: appendOnboardingRow threw");
  }
}

export async function backfillOnboardingRows(
  records: OnboardingRowData[],
): Promise<{ success: number; failed: number; skipped: number }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID ?? "";
  if (!spreadsheetId) {
    logger.warn("sheets: backfill skipped — GOOGLE_SHEET_ID not set");
    return { success: 0, failed: 0, skipped: records.length };
  }

  logger.info({ total: records.length, spreadsheetId }, "sheets: starting backfill");
  let success = 0;
  let failed = 0;

  for (const record of records) {
    try {
      await appendOnboardingRow(record);
      success++;
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      logger.warn({ err, userId: record.userId }, "sheets: backfill row failed");
      failed++;
    }
  }

  logger.info({ success, failed, total: records.length }, "sheets: backfill complete");
  return { success, failed, skipped: 0 };
}
