export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMetaQueueWorker } = await import("@/server/jobs/meta-queue-worker");
    startMetaQueueWorker();
  }
}
