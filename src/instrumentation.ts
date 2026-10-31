export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMetaQueueWorker } = await import("@/server/meta-queue-worker");
    startMetaQueueWorker();
  }
}
