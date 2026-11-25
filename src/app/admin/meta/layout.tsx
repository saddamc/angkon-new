import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isMetaSuiteEnabled, verifyAdminToken } from "@/server/auth/admin-auth";
import { getRuntimeEnvironmentInfo } from "@/server/env/app-environment";
import { MetaSuiteShell } from "./meta-shell";
import { MetaEnvironmentBar } from "./meta-environment-bar";

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

  const environmentInfo = getRuntimeEnvironmentInfo();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MetaEnvironmentBar info={environmentInfo} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <MetaSuiteShell>{children}</MetaSuiteShell>
      </div>
    </div>
  );
}
