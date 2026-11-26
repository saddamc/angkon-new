import { drainEmailDeliveryOutbox } from "@/server/email/email-outbox.service";
import { isTransientDatabaseError } from "@/lib/mongodb-dns";

const WORKER_INTERVAL_MS = 60 * 1000;
let isRunning = false;
let workerTimer: NodeJS.Timeout | null = null;

export async function runEmailOutboxDrainPass(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await drainEmailDeliveryOutbox(25);
    if (result.processed > 0) {
      console.info(
        `[Email Outbox Worker] Processed ${result.processed}: accepted=${result.accepted}, retrying=${result.retrying}, failedPermanent=${result.failedPermanent}`
      );
    }
  } catch (err) {
    if (!isTransientDatabaseError(err)) {
      console.warn("[Email Outbox Worker] Error draining email outbox:", err);
    }
  } finally {
    isRunning = false;
  }
}

export function startEmailOutboxWorker(): void {
  if (workerTimer) return;
  if (process.env.VERCEL || process.env.DISABLE_IN_PROCESS_WORKERS === "true") {
    return;
  }

  setTimeout(() => {
    runEmailOutboxDrainPass().catch(() => {});
  }, 8000);

  workerTimer = setInterval(() => {
    runEmailOutboxDrainPass().catch(() => {});
  }, WORKER_INTERVAL_MS);

  if (typeof workerTimer.unref === "function") {
    workerTimer.unref();
  }
}
