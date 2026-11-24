import { NextResponse } from "next/server";

/**
 * Liveness endpoint for the container orchestrator.
 *
 * Keep this independent from MongoDB and external services: a deployment
 * platform needs to know that the HTTP server is accepting traffic before it
 * can safely route requests to the instance.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  // Report the port that actually handled this request. This keeps local
  // development on :3001 honest while production remains :3000.
  const requestUrl = new URL(request.url);
  const port = Number(requestUrl.port) || Number(process.env.PORT) || 3000;

  return NextResponse.json(
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      port,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
