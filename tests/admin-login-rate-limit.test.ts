import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clientIp,
  extractClientIp,
  isValidIp,
  isPublicIp,
  isPrivateIp,
  isLoopbackIp,
  isCloudflareIp,
} from "../src/server/security/client-ip";
import { hashIp } from "../src/server/security/rate-limit";

describe("Admin Login Rate-Limit & Canonical Client IP Resolution", () => {
  describe("Cloudflare vs Coolify Reverse-Proxy IP Resolution", () => {
    it("trusts cf-connecting-ip when request passed through verified Cloudflare infrastructure", () => {
      const cfRequest = {
        headers: {
          get: (name: string) => {
            const lower = name.toLowerCase();
            if (lower === "cf-connecting-ip") return "103.205.71.12";
            if (lower === "cf-ray") return "a5f8e86f0eb848ff-DAC";
            if (lower === "x-real-ip") return "162.158.12.34"; // Official Cloudflare IPv4
            if (lower === "x-forwarded-for") return "103.205.71.12, 162.158.12.34";
            return null;
          },
        },
      };

      const resolved = clientIp(cfRequest);
      assert.equal(resolved, "103.205.71.12", "Must resolve visitor IP from verified Cloudflare request");
    });

    it("rejects forged cf-connecting-ip on non-Cloudflare domains (peer is not Cloudflare)", () => {
      // Attacker sends forged cf-connecting-ip to a direct/temporary Coolify domain
      const forgedRequest = {
        headers: {
          get: (name: string) => {
            const lower = name.toLowerCase();
            if (lower === "cf-connecting-ip") return "8.8.8.8"; // Forged!
            if (lower === "x-real-ip") return "198.51.100.22"; // Direct attacker connection to Traefik
            if (lower === "x-forwarded-for") return "8.8.8.8, 198.51.100.22";
            return null;
          },
        },
      };

      const resolved = clientIp(forgedRequest);
      // Must ignore the forged 8.8.8.8 and use Traefik's verified caller address 198.51.100.22
      assert.equal(resolved, "198.51.100.22", "Must use Coolify reverse proxy peer address, not forged CF header");
    });

    it("defeats X-Forwarded-For spoofing by reading right-to-left", () => {
      const spoofedRequest = {
        headers: {
          get: (name: string) => {
            const lower = name.toLowerCase();
            if (lower === "x-forwarded-for") return "1.1.1.1, 2.2.2.2, 203.0.113.195";
            return null;
          },
        },
      };

      const resolved = clientIp(spoofedRequest);
      assert.equal(resolved, "203.0.113.195", "Must read the rightmost non-spoofed IP appended by proxy");
    });

    it("ignores internal Docker bridge proxy hops in X-Forwarded-For chain", () => {
      // Traefik running on host forwards through Docker bridge 172.18.0.2 to container
      const dockerProxyChain = {
        headers: {
          get: (name: string) => {
            const lower = name.toLowerCase();
            if (lower === "x-forwarded-for") return "103.145.132.55, 172.18.0.2";
            return null;
          },
        },
      };

      const resolved = clientIp(dockerProxyChain);
      assert.equal(resolved, "103.145.132.55", "Must skip internal Docker private network hop and find public client IP");
    });

    it("handles missing and malformed IPs safely without throwing", () => {
      assert.equal(clientIp(null), "unknown");
      assert.equal(clientIp(undefined), "unknown");
      assert.equal(clientIp({ headers: { get: () => "invalid-ip-string" } }), "unknown");
      assert.equal(clientIp({ headers: { get: () => "999.999.999.999" } }), "unknown");
      assert.equal(extractClientIp(null), undefined);
    });

    it("identifies Cloudflare IP CIDRs accurately", () => {
      assert.equal(isCloudflareIp("162.158.12.34"), true);
      assert.equal(isCloudflareIp("104.16.50.1"), true);
      assert.equal(isCloudflareIp("172.64.0.5"), true);
      assert.equal(isCloudflareIp("173.245.48.1"), true);
      assert.equal(isCloudflareIp("2606:4700:4700::1111"), true);
      assert.equal(isCloudflareIp("8.8.8.8"), false);
      assert.equal(isCloudflareIp("203.0.113.1"), false);
      assert.equal(isCloudflareIp("192.168.1.1"), false);
    });
  });

  describe("HMAC IP Privacy & Anonymization", () => {
    it("never exposes plain client IP in hashes or keys", () => {
      const rawIp = "103.205.71.12";
      const hashed = hashIp(rawIp);
      assert.equal(hashed.includes("103"), false, "Plain IP octet must not be in hash");
      assert.equal(hashed.includes("205"), false, "Plain IP octet must not be in hash");
      assert.equal(hashed.length, 16, "Must be truncated 16-hex-char digest");
    });

    it("returns 'unknown' without crashing when given empty or unknown input", () => {
      assert.equal(hashIp(""), "unknown");
      assert.equal(hashIp("unknown"), "unknown");
      assert.equal(hashIp("  UNKNOWN  "), "unknown");
    });
  });
});
