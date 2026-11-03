import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Vercel Hobby accounts reject cron schedules that run more than once per day.
 *
 * The schedule `0 0 * * *` runs exactly once per day at midnight UTC.
 * Anything with a step (`* /10 * * * *`) or an hourly/minute-level cron will
 * fail deployment with:
 *   "Hobby accounts are limited to cron jobs that run once per day."
 */

const VERCEL_JSON = "vercel.json";

function parseCrons() {
  const raw = fs.readFileSync(VERCEL_JSON, "utf8");
  const json = JSON.parse(raw);
  assert.ok(Array.isArray(json.crons), "vercel.json must define a crons array");
  return json.crons;
}

function isHobbyCompliant(schedule) {
  // Only exact "once per day at a fixed hour/minute" (or less frequent) is safe
  // on Hobby. This accepts `0 0 * * *`, `0 5 * * *`, `0 0 * * 0`, etc.
  // It rejects any step (`*/n`), ranges with multiple values, or minute-level cadence.
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // minute and hour must be single fixed values
  if (!/^\d{1,2}$/.test(minute) || Number(minute) > 59) return false;
  if (!/^\d{1,2}$/.test(hour) || Number(hour) > 23) return false;

  // day/month must not be lists or ranges that cause multiple runs per day
  if (dayOfMonth.includes(",") || dayOfMonth.includes("-")) return false;
  if (month.includes(",") || month.includes("-")) return false;

  // dayOfWeek may be a single digit (e.g. 0 for Sunday = weekly) or * for daily
  if (dayOfWeek.includes(",") || dayOfWeek.includes("-")) return false;

  return true;
}

test("vercel.json exists and has a crons array", () => {
  assert.ok(fs.existsSync(VERCEL_JSON), "vercel.json must exist");
  const crons = parseCrons();
  assert.ok(crons.length > 0, "at least one cron must be configured");
});

test("every cron schedule is Hobby-compliant (at most once per day)", () => {
  const crons = parseCrons();
  for (const cron of crons) {
    assert.ok(cron.path, "cron must have a path");
    assert.ok(
      cron.schedule,
      `cron ${cron.path} must have a schedule`
    );
    assert.ok(
      isHobbyCompliant(cron.schedule),
      `cron ${cron.path} schedule "${cron.schedule}" is not allowed on Vercel Hobby. Use a fixed once-per-day expression such as "0 0 * * *".`
    );
  }
});

test("meta-sync cron path has a matching API route", () => {
  const crons = parseCrons();
  const metaSync = crons.find((c) => c.path === "/api/cron/meta-sync");
  assert.ok(metaSync, "a cron for /api/cron/meta-sync must exist");
  assert.ok(
    fs.existsSync("src/app/api/cron/meta-sync/route.ts"),
    "the cron path must map to src/app/api/cron/meta-sync/route.ts"
  );
});

test("current schedule is the agreed daily midnight cadence", () => {
  const crons = parseCrons();
  const metaSync = crons.find((c) => c.path === "/api/cron/meta-sync");
  assert.equal(metaSync?.schedule, "0 0 * * *");
});
