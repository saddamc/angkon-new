import { redirect } from "next/navigation";

/**
 * Backward-compatible redirect from legacy /admin/meta/conversions-api
 * to the consolidated /admin/meta/events route.
 */
export default function DeprecatedConversionsApiRoutePage() {
  redirect("/admin/meta/events?tab=conversions-api");
}
