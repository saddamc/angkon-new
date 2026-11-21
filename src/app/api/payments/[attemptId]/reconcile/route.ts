import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { ReconcilePaymentService } from "@/server/payments/services/reconcile-payment";
import { PaymentError } from "@/server/payments/payment-errors";
import { securityLog } from "@/server/security-log";
import { isValidObjectId } from "@/server/payments/utils/object-id";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAdminSessionCore(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { attemptId } = await params;
  if (!isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  try {
    const result = await ReconcilePaymentService.reconcile(attemptId);
    securityLog("payment.reconciliation_run", {
      actor: `admin:${auth.user || "unknown"}`,
      attemptId,
      status: result.status,
    });
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.statusCode || 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Reconciliation failed." },
      { status: 500 }
    );
  }
}
