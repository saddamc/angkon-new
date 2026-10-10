import "server-only";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

function wcAuthHeader(): string {
  return `Basic ${Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64")}`;
}

interface WcFetchOptions {
  /** Seconds to cache for, or false to disable caching (`no-store`). */
  revalidate?: number | false;
  tags?: string[];
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${WC_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export function isWooConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_WC_API_URL;
  if (!url || url.includes("netbazarbd.net") || !WC_CK || !WC_CS) {
    return false;
  }
  return true;
}

async function rawFetch(path: string, params: Record<string, string>, opts: WcFetchOptions): Promise<Response> {
  if (!isWooConfigured()) {
    throw new Error("WOOCOMMERCE_NOT_CONFIGURED");
  }

  const res = await fetch(buildUrl(path, params), {
    headers: { Authorization: wcAuthHeader() },
    ...(opts.revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate: opts.revalidate ?? 300, tags: opts.tags } }),
  });

  if (!res.ok) {
    console.warn(`[WooCommerce API] Warning: ${path} -> ${res.status}`);
    throw new Error(`WOOCOMMERCE_FETCH_FAILED_${res.status}`);
  }
  return res;
}

export async function wcFetch<T>(path: string, params: Record<string, string> = {}, opts: WcFetchOptions = {}): Promise<T> {
  const res = await rawFetch(path, params, opts);
  return res.json() as Promise<T>;
}

export async function wcFetchRaw<T>(
  path: string,
  params: Record<string, string> = {},
  opts: WcFetchOptions = {},
): Promise<{ data: T; totalItems: number; totalPages: number }> {
  const res = await rawFetch(path, params, opts);
  const data = (await res.json()) as T;
  return {
    data,
    totalItems: Number(res.headers.get("X-WP-Total") ?? 0),
    totalPages: Number(res.headers.get("X-WP-TotalPages") ?? 0),
  };
}
