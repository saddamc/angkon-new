/**
 * Pure queue-count arithmetic.
 *
 * Kept import-free so the invariant can be unit-tested directly:
 * every scanned record is either eligible, pending (not due yet) or skipped
 * (not reconcilable). A record must never be counted twice.
 */
export interface QueueCountsInput {
  scanned: number;
  eligible: number;
  skipped: number;
}

export function computePendingCount(input: QueueCountsInput): number {
  const pending = input.scanned - input.eligible - input.skipped;
  return pending > 0 ? pending : 0;
}

export function assertQueueInvariant(input: QueueCountsInput): boolean {
  return (
    input.scanned >= 0 &&
    input.eligible >= 0 &&
    input.skipped >= 0 &&
    input.eligible + input.skipped <= input.scanned
  );
}
