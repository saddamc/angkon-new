import { notFound } from "next/navigation";
import { isMetaSuiteEnabled } from "@/server/admin-auth";

export default function MetaRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If the Meta Marketing Suite is administratively disabled, hide all subroutes with 404
  if (!isMetaSuiteEnabled()) {
    notFound();
  }

  return <>{children}</>;
}
