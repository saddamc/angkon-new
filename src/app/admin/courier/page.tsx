import { redirect } from "next/navigation";

export default function AdminCourierRedirectPage() {
  redirect("/admin/settings?tab=courier");
}
