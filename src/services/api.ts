/**
 * Client-Side API Helper
 * Standardized typed fetch utility for internal Next.js API endpoints.
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data && typeof data === "object" && "error" in data)
      ? String((data as { error: string }).error)
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export default apiFetch;
