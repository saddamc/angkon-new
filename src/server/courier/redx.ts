/**
 * Re-export RedX Courier Integration Scaffold from dedicated ./redx/ module.
 *
 * Implements Stage 3 & 4 multi-courier architecture specifications:
 * - Shared CourierAdapter interface
 * - Capability flags
 * - Pure request / response / status mappers
 * - Fail-closed webhook verification placeholder
 * - Safe fail-closed booking gate returning PROVIDER_NOT_CONFIGURED until live credentials & docs are supplied
 */

export {
  RedxAdapter,
  redxAdapter,
  getRedxConfig,
  isRedxConfigured,
  getRedxAreas,
} from "./redx/redx";

export {
  mapRedxStatus,
  mapRedxCreatePayload,
  mapRedxResponse,
} from "./redx/mapper";

export {
  verifyRedxWebhookSignature,
} from "./redx/webhook";

export {
  REDX_CAPABILITIES,
  type RedxConfig,
  type RedxCapabilityFlags,
  type RedxAreaItem,
  type RedxParcelDraft,
  type RedxBookingResult,
} from "./redx/types";
