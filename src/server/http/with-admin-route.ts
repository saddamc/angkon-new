import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore, requireSuperAdminSession } from "@/server/auth/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { mapErrorToResponse } from "./api-errors";

export interface AdminRouteContext {
  user: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
  params?: Record<string, string | string[]>;
}

export interface AdminRouteOptions {
  superAdminOnly?: boolean;
  autoConnectDb?: boolean;
}

export type AdminRouteHandler = (
  request: NextRequest,
  context: AdminRouteContext
) => Promise<NextResponse | Response>;

export function withAdminRoute(
  handler: AdminRouteHandler,
  options: AdminRouteOptions = {}
) {
  return async (request: NextRequest, rawRouteContext?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> }) => {
    try {
      const auth = options.superAdminOnly
        ? await requireSuperAdminSession(request)
        : await requireAdminSessionCore(request);

      if (!auth.authorized) {
        return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (options.autoConnectDb !== false) {
        await connectToDatabase();
      }

      let params: Record<string, string | string[]> | undefined;
      if (rawRouteContext?.params) {
        params = rawRouteContext.params instanceof Promise
          ? await rawRouteContext.params
          : rawRouteContext.params;
      }

      const context: AdminRouteContext = {
        user: auth.user || "admin",
        tenantId: auth.tenantId,
        isSuperAdmin: Boolean(options.superAdminOnly),
        params,
      };

      return await handler(request, context);
    } catch (error) {
      return mapErrorToResponse(error);
    }
  };
}
