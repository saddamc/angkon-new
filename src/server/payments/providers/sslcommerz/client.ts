import { getSslcommerzConfig } from "./config";
import { GatewayCommunicationError, GatewayTimeoutError } from "../../payment-errors";

export class SslcommerzClient {
  /**
   * Performs an HTTPS POST request to SSLCOMMERZ with x-www-form-urlencoded body.
   */
  public static async postForm<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const config = getSslcommerzConfig();
    const body = new URLSearchParams(params).toString();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ANGKON-Payment-Gateway/2.0",
        },
        body,
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (!res.ok) {
        throw new GatewayCommunicationError(
          `SSLCOMMERZ responded with HTTP status ${res.status} ${res.statusText}`
        );
      }

      return (await res.json()) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutError(
          `Request to SSLCOMMERZ timed out after ${config.timeoutMs}ms.`
        );
      }
      if (error instanceof GatewayCommunicationError) {
        throw error;
      }
      throw new GatewayCommunicationError(
        `Failed to communicate with SSLCOMMERZ: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Performs an HTTPS GET request to SSLCOMMERZ.
   */
  public static async getJson<T>(
    endpoint: string,
    queryParams: Record<string, string>
  ): Promise<T> {
    const config = getSslcommerzConfig();
    const query = new URLSearchParams(queryParams).toString();
    const url = `${endpoint}?${query}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "ANGKON-Payment-Gateway/2.0",
        },
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (!res.ok) {
        throw new GatewayCommunicationError(
          `SSLCOMMERZ validator responded with HTTP ${res.status}`
        );
      }

      return (await res.json()) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutError(
          `SSLCOMMERZ validation query timed out after ${config.timeoutMs}ms.`
        );
      }
      if (error instanceof GatewayCommunicationError) {
        throw error;
      }
      throw new GatewayCommunicationError(
        `SSLCOMMERZ request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
