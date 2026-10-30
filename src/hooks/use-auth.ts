"use client";

import { useCallback } from "react";

/**
 * Auth is now cookie-based (HttpOnly cookie set by /api/admin/login).
 * The frontend never reads/writes the token directly — that's intentional.
 * The middleware verifies the cookie on every /admin/* request server-side.
 */
export function useAuth() {
  const logout = useCallback(async () => {
    // Ask server to clear the HttpOnly cookie
    await fetch("/api/admin/login", { method: "DELETE" });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin";
  }, []);

  // authFetch — credentials: "include" sends the HttpOnly cookie automatically
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(options.headers as Record<string, string>),
      },
    });
  }, []);

  return { logout, authFetch };
}
