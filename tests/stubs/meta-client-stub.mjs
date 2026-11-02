/**
 * Controllable stand-in for `@/lib/integrations/meta/client`.
 *
 * Tests drive the Graph response (or failure) directly instead of reaching
 * Meta over the network.
 */

export const DEFAULT_META_GRAPH_VERSION = "v22.0";
export const META_GRAPH_BASE_URL = "https://graph.facebook.com";

export const graphState = {
  payload: null,
  error: null,
  /** Errors consumed one per call before falling back to `payload`. */
  errors: [],
  calls: [],
  /** When true, the first call throws a field-selection error (code 100). */
  rejectFieldsOnce: false,
};

export function resetGraph() {
  graphState.payload = null;
  graphState.error = null;
  graphState.errors = [];
  graphState.calls = [];
  graphState.rejectFieldsOnce = false;
}

export class MetaGraphApiError extends Error {
  constructor(status, raw = {}) {
    super(raw.message || `Meta Graph API returned HTTP ${status}`);
    this.name = "MetaGraphApiError";
    this.status = status;
    this.code = raw.code || status;
    this.errorSubcode = raw.error_subcode;
    this.errorType = raw.type;
    this.category = raw.category || "UNKNOWN";
    this.isRateLimit = this.code === 32 || status === 429;
    this.isFatal = false;
  }
}

export async function callMetaGraphApi(path, options) {
  graphState.calls.push({ path, params: options.params, token: options.accessToken });

  if (graphState.rejectFieldsOnce) {
    graphState.rejectFieldsOnce = false;
    throw new MetaGraphApiError(400, {
      code: 100,
      message: "(#100) Unknown field: match_key_feedback",
      category: "RESOURCE_NOT_FOUND",
    });
  }

  if (graphState.errors.length) throw graphState.errors.shift();
  if (graphState.error) throw graphState.error;

  return { data: graphState.payload, status: 200, headers: new Headers() };
}
