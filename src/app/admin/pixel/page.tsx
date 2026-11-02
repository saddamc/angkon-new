import { redirect } from "next/navigation";

/**
 * Legacy admin/pixel route redirecting to consolidated /admin/meta/events
 */
export default function AdminPixelPage() {
  redirect("/admin/meta/events?tab=events-manager");
}
