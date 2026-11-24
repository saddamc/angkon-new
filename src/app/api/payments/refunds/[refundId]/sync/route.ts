import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { ProcessRefundService } from "@/server/payments/services/process-refund";
import { PaymentError } from "@/server/payments/payment-errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ refundId: string }> }
) {
  const auth = await requireAdminSessionCore(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { refundId } = await params;
  if (!refundId) {
    return NextResponse.json({ ok: false, error: "Refund ID is required." }, { status: 400 });
  }

  try {
    const result = await ProcessRefundService.syncRefundStatus(refundId);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    if (err instanceof PaymentError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.statusCode || 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Refund sync error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
