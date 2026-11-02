import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── Pure Logic Replicas of the Field Deduplication & Request Building ──

function deduplicateFieldsList(fields) {
  const rawList = Array.isArray(fields)
    ? fields
    : typeof fields === "string"
    ? fields.split(",")
    : [];

  const seen = new Set();
  const unique = [];

  for (const raw of rawList) {
    const field = String(raw || "").trim();
    if (field && !seen.has(field)) {
      seen.add(field);
      unique.push(field);
    }
  }

  return unique;
}

function deduplicateFields(fields) {
  return deduplicateFieldsList(fields).join(",");
}

const META_INSIGHT_COMMON_METRICS = [
  "spend",
  "impressions",
  "clicks",
  "reach",
  "frequency",
  "cpc",
  "cpm",
  "ctr",
  "cost_per_action_type",
  "purchase_roas",
  "actions",
  "action_values",
  "date_start",
];

function buildInsightsFieldsForLevel(level = "campaign") {
  let levelSpecificFields = [];

  if (level === "adset") {
    levelSpecificFields = ["campaign_id", "campaign_name", "adset_id", "adset_name"];
  } else if (level === "ad") {
    levelSpecificFields = ["campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name"];
  } else if (level === "account") {
    levelSpecificFields = ["account_id", "account_name"];
  } else {
    levelSpecificFields = ["campaign_id", "campaign_name"];
  }

  return deduplicateFields([...levelSpecificFields, ...META_INSIGHT_COMMON_METRICS]);
}

function buildInsightsEndpoint({
  version = "v22.0",
  actId = "act_1234567890",
  level = "campaign",
  since = "2026-10-01",
  until = "2026-10-31",
  customFields = undefined,
}) {
  const fields = customFields
    ? deduplicateFields(customFields)
    : buildInsightsFieldsForLevel(level);

  const timeRange = JSON.stringify({ since, until });
  const actionWindowsParam = encodeURIComponent(JSON.stringify(["7d_click", "1d_view"]));
  const actionReportTimeParam = "conversion";

  return `https://graph.facebook.com/${version}/${actId}/insights?level=${level}&fields=${fields}&time_range=${encodeURIComponent(
    timeRange
  )}&time_increment=1&action_attribution_windows=${actionWindowsParam}&action_report_time=${actionReportTimeParam}&limit=100`;
}

// ── Tests ─────────────────────────────────────────────────────────────

test("deduplicateFields - removes duplicate field names from comma-separated string", () => {
  const input = "campaign_id,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,spend";
  const result = deduplicateFields(input);
  const expected = "campaign_id,adset_id,adset_name,campaign_name,spend,impressions";
  assert.equal(result, expected);

  // campaign_id appears only once
  const occurrences = result.split(",").filter((f) => f === "campaign_id").length;
  assert.equal(occurrences, 1);
});

test("deduplicateFields - handles string arrays and trims whitespace/empty items", () => {
  const input = [" campaign_id ", "adset_id", "  ", "", "campaign_id", "spend "];
  const result = deduplicateFields(input);
  assert.equal(result, "campaign_id,adset_id,spend");
});

test("deduplicateFields - returns empty string on null, undefined, or empty string", () => {
  assert.equal(deduplicateFields(""), "");
  assert.equal(deduplicateFields([]), "");
  assert.equal(deduplicateFields(null), "");
  assert.equal(deduplicateFields(undefined), "");
});

test("buildInsightsFieldsForLevel - campaign level has no duplicates and contains campaign_id once", () => {
  const fieldsStr = buildInsightsFieldsForLevel("campaign");
  const fields = fieldsStr.split(",");

  // Check unique
  const set = new Set(fields);
  assert.equal(fields.length, set.size, "Every field in campaign level must be unique");

  // Check critical fields
  assert.ok(fields.includes("campaign_id"));
  assert.ok(fields.includes("campaign_name"));
  assert.ok(fields.includes("spend"));
  assert.ok(fields.includes("purchase_roas"));
  assert.equal(fields.filter((f) => f === "campaign_id").length, 1);
});

test("buildInsightsFieldsForLevel - adset level has no duplicates (Regression for Error 2500)", () => {
  const fieldsStr = buildInsightsFieldsForLevel("adset");
  const fields = fieldsStr.split(",");

  // Check unique
  const set = new Set(fields);
  assert.equal(fields.length, set.size, "Every field in adset level must be unique (no duplicates)");

  // Check critical fields
  assert.ok(fields.includes("campaign_id"));
  assert.ok(fields.includes("campaign_name"));
  assert.ok(fields.includes("adset_id"));
  assert.ok(fields.includes("adset_name"));
  assert.ok(fields.includes("spend"));
  assert.equal(fields.filter((f) => f === "campaign_id").length, 1, "campaign_id must appear exactly once");
  assert.equal(fields.filter((f) => f === "adset_id").length, 1, "adset_id must appear exactly once");
});

test("buildInsightsFieldsForLevel - ad level has no duplicates (Regression for Error 2500)", () => {
  const fieldsStr = buildInsightsFieldsForLevel("ad");
  const fields = fieldsStr.split(",");

  // Check unique
  const set = new Set(fields);
  assert.equal(fields.length, set.size, "Every field in ad level must be unique (no duplicates)");

  // Check critical fields
  assert.ok(fields.includes("campaign_id"));
  assert.ok(fields.includes("campaign_name"));
  assert.ok(fields.includes("adset_id"));
  assert.ok(fields.includes("adset_name"));
  assert.ok(fields.includes("ad_id"));
  assert.ok(fields.includes("ad_name"));
  assert.ok(fields.includes("spend"));
  assert.equal(fields.filter((f) => f === "campaign_id").length, 1, "campaign_id must appear exactly once");
  assert.equal(fields.filter((f) => f === "adset_id").length, 1, "adset_id must appear exactly once");
  assert.equal(fields.filter((f) => f === "ad_id").length, 1, "ad_id must appear exactly once");
});

test("buildInsightsFieldsForLevel - account level has no duplicates and no foreign campaign_id", () => {
  const fieldsStr = buildInsightsFieldsForLevel("account");
  const fields = fieldsStr.split(",");

  const set = new Set(fields);
  assert.equal(fields.length, set.size, "Every field in account level must be unique");

  assert.ok(fields.includes("account_id"));
  assert.ok(fields.includes("account_name"));
  assert.ok(!fields.includes("campaign_id"), "Account level should not request campaign_id");
});

test("Regression against Meta Error 2500: Full request URLs have zero duplicate fields across all levels", () => {
  const levels = ["campaign", "adset", "ad", "account"];

  for (const level of levels) {
    const urlStr = buildInsightsEndpoint({ level });
    const url = new URL(urlStr);
    const fieldsParam = url.searchParams.get("fields");

    assert.ok(fieldsParam, `Fields param must be present for level ${level}`);

    const fieldList = fieldsParam.split(",");
    const seen = new Set();
    const duplicates = [];

    for (const f of fieldList) {
      if (seen.has(f)) {
        duplicates.push(f);
      }
      seen.add(f);
    }

    assert.deepEqual(
      duplicates,
      [],
      `URL for level '${level}' contains duplicate fields: ${duplicates.join(", ")}. Error 2500 would trigger!`
    );
  }
});

test("Custom fields deduplication: even when caller passes duplicate fields, query builder cleans them", () => {
  const urlStr = buildInsightsEndpoint({
    level: "adset",
    customFields: "campaign_id,adset_id,campaign_id,spend,cpc,spend,actions",
  });
  const url = new URL(urlStr);
  const fieldsParam = url.searchParams.get("fields");

  assert.equal(fieldsParam, "campaign_id,adset_id,spend,cpc,actions");
});

test("Live codebase verification: meta-marketing-api.ts and meta-ads.ts export and use deduplicateFields", () => {
  const apiFile = fs.readFileSync(path.resolve("src/server/meta-marketing-api.ts"), "utf-8");
  const adsFile = fs.readFileSync(path.resolve("src/server/meta-ads.ts"), "utf-8");

  assert.ok(apiFile.includes("export function deduplicateFields"), "deduplicateFields must be exported from meta-marketing-api");
  assert.ok(apiFile.includes("export function buildInsightsFieldsForLevel"), "buildInsightsFieldsForLevel must be exported from meta-marketing-api");
  assert.ok(apiFile.includes("buildInsightsFieldsForLevel(level)"), "fetchMetaDailyInsightsSlice must call buildInsightsFieldsForLevel");
  assert.ok(apiFile.includes("deduplicateFields("), "fetchMetaDailyInsightsSlice must call deduplicateFields");

  // Verify previous bug pattern is gone:
  assert.ok(!apiFile.includes("fields = `campaign_id,adset_id,adset_name,${fields}`"), "Old duplicate campaign_id bug pattern must not exist");
  assert.ok(!apiFile.includes("fields = `campaign_id,adset_id,ad_id,ad_name,${fields}`"), "Old duplicate campaign_id bug pattern must not exist");

  assert.ok(adsFile.includes("deduplicateFields"), "meta-ads.ts must import and use deduplicateFields");
});
