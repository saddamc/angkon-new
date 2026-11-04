import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * `/admin` is an entry point, not a screen.
 *
 * Guests never reach this component: `src/proxy.ts` intercepts every
 * `/admin/*` request, including `/admin` itself, and sends unauthenticated
 * callers to `/admin/login` before any admin code renders. Authenticated
 * callers arrive here and go straight to the dashboard.
 *
 * Keeping this route redirect-only means no administrative page is ever served
 * in response to an unauthenticated request, and signed-in users no longer see
 * a flash of the login form before being bounced to the dashboard.
 */
export default function AdminEntryPage() {
  redirect("/admin/dashboard");
}
