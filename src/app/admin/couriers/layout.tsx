import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/server/auth/admin-auth";

/** Courier operations are restricted to Super Admins. */
export default async function CouriersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("nb_admin_token")?.value;
  const auth = await verifyAdminToken(token);

  if (!auth.valid || auth.role !== "superadmin") {
    redirect("/admin/dashboard");
  }

  return children;
}
