import { redirect } from "next/navigation";

/**
 * Backward-compatible redirect from legacy /admin/meta/pixel
 * to the consolidated /admin/meta/events route.
 */
export default function DeprecatedPixelRoutePage() {
  redirect("/admin/meta/events?tab=events-manager");
}
