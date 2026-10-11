import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/server/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true, message: "Logged out successfully." });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
