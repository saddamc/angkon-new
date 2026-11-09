import { drainMetaCapiQueue } from "./meta-capi";
import { DEFAULT_TENANT_ID } from "./tenant";

const WORKER_INTERVAL_MS = 60 * 1000; // 60 seconds
let isWorkerRunning = false;
let workerTimer: NodeJS.Timeout | null = null;

/**
 * Executes a single queue drain pass with concurrency locking.
 */
export async function runMetaQueueDrainPass(tenantId = DEFAULT_TENANT_ID): Promise<void> {
  if (isWorkerRunning) {
    return;
  }

  isWorkerRunning = true;
  try {
    const result = await drainMetaCapiQueue(tenantId, 25);
    if (result.processed > 0) {
      console.log(
        `[Meta Queue Worker] Drained ${result.processed} events: ${result.accepted} accepted, ${result.retrying} retrying, ${result.failed} failed.`
      );
    }
  } catch (err) {
    console.warn("[Meta Queue Worker] Error during scheduled queue drain pass:", err);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Starts the automated periodic Meta Conversions API queue retry worker.
 * Idempotent: multiple calls will not create duplicate timers.
 */
export function startMetaQueueWorker(tenantId = DEFAULT_TENANT_ID): void {
  if (workerTimer) {
    return;
  }

  // In Vercel serverless environments, in-process setInterval loops consume Fluid CPU
  // and keep microVM containers awake. In serverless, background work should run via cron or on-demand.
  if (process.env.VERCEL) {
    return;
  }

  console.log("[Meta Queue Worker] Starting Conversions API background retry worker (interval: 60s)...");

  // Initial delayed drain pass after startup
  setTimeout(() => {
    runMetaQueueDrainPass(tenantId).catch(() => {});
  }, 5000);

  // Standing recurring interval
  workerTimer = setInterval(() => {
    runMetaQueueDrainPass(tenantId).catch(() => {});
  }, WORKER_INTERVAL_MS);

  // Unref timer so it does not block Node process termination in CLI/scripts
  if (typeof workerTimer.unref === "function") {
    workerTimer.unref();
  }
}

/**
 * Stops the automated queue worker (useful for tests or graceful shutdown).
 */
export function stopMetaQueueWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log("[Meta Queue Worker] Stopped Conversions API background retry worker.");
  }
}
