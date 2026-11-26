import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/auth/auth";
import { User, type IUser } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { mapErrorToResponse } from "./api-errors";

export interface CustomerRouteContext {
  userId?: string | null;
  user?: IUser | null;
  params?: Record<string, string | string[]>;
}

export interface CustomerRouteOptions {
  requireAuth?: boolean;
  autoConnectDb?: boolean;
}

export type CustomerRouteHandler = (
  request: NextRequest,
  context: CustomerRouteContext
) => Promise<NextResponse | Response>;

export function withCustomerRoute(
  handler: CustomerRouteHandler,
  options: CustomerRouteOptions = {}
) {
  return async (request: NextRequest, rawRouteContext: { params: Promise<Record<string, string | string[]>> }) => {
    try {
      if (options.autoConnectDb !== false) {
        await connectToDatabase();
      }

      const userId = getSessionUserId(request);
      let user: IUser | null = null;

      if (userId) {
        user = await User.findById(userId);
      }

      if (options.requireAuth && (!userId || !user)) {
        return NextResponse.json({ error: "Authentication required", code: "UNAUTHORIZED" }, { status: 401 });
      }

      let params: Record<string, string | string[]> | undefined;
      if (rawRouteContext?.params) {
        params = rawRouteContext.params instanceof Promise
          ? await rawRouteContext.params
          : rawRouteContext.params;
      }

      const context: CustomerRouteContext = {
        userId,
        user,
        params,
      };

      return await handler(request, context);
    } catch (error) {
      return mapErrorToResponse(error);
    }
  };
}
