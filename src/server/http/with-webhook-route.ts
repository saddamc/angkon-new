import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { mapErrorToResponse } from "./api-errors";

export interface WebhookRouteContext {
  signature?: string | null;
  params?: Record<string, string | string[]>;
}

export interface WebhookRouteOptions {
  autoConnectDb?: boolean;
  verifySignature?: (request: NextRequest) => boolean | Promise<boolean>;
}

export type WebhookRouteHandler = (
  request: NextRequest,
  context: WebhookRouteContext
) => Promise<NextResponse | Response>;

export function withWebhookRoute(
  handler: WebhookRouteHandler,
  options: WebhookRouteOptions = {}
) {
  return async (request: NextRequest, rawRouteContext?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> }) => {
    try {
      if (options.verifySignature) {
        const verified = await options.verifySignature(request);
        if (!verified) {
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
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

      const context: WebhookRouteContext = {
        signature: request.headers.get("x-signature") || request.headers.get("x-hub-signature-256"),
        params,
      };

      return await handler(request, context);
    } catch (error) {
      return mapErrorToResponse(error, "Webhook processing failed");
    }
  };
}
