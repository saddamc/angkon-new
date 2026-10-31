import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isMetaSuiteEnabled, verifyAdminToken } from "@/server/admin-auth";

export default async function MetaRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If the Meta Marketing Suite is administratively disabled, hide all subroutes with 404
  if (!isMetaSuiteEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("nb_admin_token")?.value;
  const tokenVerification = await verifyAdminToken(token);

  if (!tokenVerification.valid || tokenVerification.role !== "superadmin") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
