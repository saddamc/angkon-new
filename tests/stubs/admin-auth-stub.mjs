/** Mutable session state for the admin-auth stub used by API route tests. */

export const sessionState = {
  authorized: true,
  role: "superadmin",
  tenantId: "tenant-test",
};

export function resetSession() {
  sessionState.authorized = true;
  sessionState.role = "superadmin";
  sessionState.tenantId = "tenant-test";
}

export async function requireSuperAdminSession() {
  if (!sessionState.authorized) {
    return {
      authorized: false,
      tenantId: sessionState.tenantId,
      authorizedTenants: [sessionState.tenantId],
      response: Response.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      ),
    };
  }

  if (sessionState.role !== "superadmin") {
    return {
      authorized: false,
      tenantId: sessionState.tenantId,
      authorizedTenants: [sessionState.tenantId],
      response: Response.json(
        { error: "Forbidden: Super Administrator privileges required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    role: sessionState.role,
    tenantId: sessionState.tenantId,
    authorizedTenants: [sessionState.tenantId],
  };
}
