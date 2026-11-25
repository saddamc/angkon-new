import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import imageLoader, {
  normalizeDeliveryDomain,
  buildCloudinaryDeliveryUrl,
  isCloudinaryUrl,
} from "../src/lib/image-loader";

const CLOUD_NAME = "drtzgyetn";
const SAMPLE_ASSET = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`;
const SAMPLE_ASSET_NO_VERSION = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`;
const SAMPLE_ASSET_WITH_TRANSFORMS = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_400,q_80,c_fill/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`;

describe("Cloudinary delivery configuration & URL generation", () => {
  const originalEnv = process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;
    }
  });

  describe("normalizeDeliveryDomain", () => {
    it("returns null for undefined, null, or non-string inputs", () => {
      assert.equal(normalizeDeliveryDomain(undefined), null);
      assert.equal(normalizeDeliveryDomain(null), null);
      assert.equal(normalizeDeliveryDomain("" as unknown as null), null);
    });

    it("returns null for empty strings or whitespace-only strings", () => {
      assert.equal(normalizeDeliveryDomain(""), null);
      assert.equal(normalizeDeliveryDomain("   "), null);
      assert.equal(normalizeDeliveryDomain("\t\n"), null);
    });

    it("normalizes clean domain strings without protocol", () => {
      assert.equal(normalizeDeliveryDomain("img.angkon.net"), "img.angkon.net");
      assert.equal(normalizeDeliveryDomain("images.cdn.nexcraftly.com"), "images.cdn.nexcraftly.com");
    });

    it("strips http:// and https:// protocols and trailing slashes", () => {
      assert.equal(normalizeDeliveryDomain("https://img.angkon.net/"), "img.angkon.net");
      assert.equal(normalizeDeliveryDomain("http://img.angkon.net///"), "img.angkon.net");
      assert.equal(normalizeDeliveryDomain("  https://img.angkon.net/  "), "img.angkon.net");
    });
  });

  describe("buildCloudinaryDeliveryUrl", () => {
    it("uses standard Cloudinary hostname (https://res.cloudinary.com) when env is undefined", () => {
      const url = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 800, undefined, undefined);
      assert.ok(url.startsWith("https://res.cloudinary.com/"), `Expected standard hostname, got: ${url}`);
      assert.equal(
        url,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("uses standard Cloudinary hostname when env is empty or whitespace", () => {
      const emptyUrl = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 800, undefined, "");
      assert.ok(emptyUrl.startsWith("https://res.cloudinary.com/"));
      assert.equal(
        emptyUrl,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );

      const whitespaceUrl = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 800, undefined, "   ");
      assert.ok(whitespaceUrl.startsWith("https://res.cloudinary.com/"));
      assert.equal(
        whitespaceUrl,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("uses custom delivery hostname only when explicitly provided", () => {
      const customUrl = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 800, undefined, "img.angkon.net");
      assert.ok(customUrl.startsWith("https://img.angkon.net/"), `Expected custom hostname, got: ${customUrl}`);
      assert.equal(
        customUrl,
        `https://img.angkon.net/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("handles custom domain configured with https:// and trailing slashes safely", () => {
      const customUrl = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 800, undefined, "https://img.angkon.net/");
      assert.ok(customUrl.startsWith("https://img.angkon.net/"));
      assert.ok(!customUrl.includes("https://https://"), "Must not create duplicate protocol");
      assert.equal(
        customUrl,
        `https://img.angkon.net/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("does not carry the cloud name into a custom delivery hostname", () => {
      const storedCustom = `https://images.nexcraftly.com/${CLOUD_NAME}/image/upload/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`;
      const customUrl = buildCloudinaryDeliveryUrl(storedCustom, 800, undefined, "images.nexcraftly.com");
      assert.equal(
        customUrl,
        "https://images.nexcraftly.com/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp",
      );
    });

    it("preserves folder hierarchy, asset version, and filename without versions", () => {
      const url = buildCloudinaryDeliveryUrl(SAMPLE_ASSET_NO_VERSION, 600, undefined, undefined);
      assert.equal(
        url,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_600,c_limit/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("replaces existing transformations without duplicate /image/upload/ paths", () => {
      const url = buildCloudinaryDeliveryUrl(SAMPLE_ASSET_WITH_TRANSFORMS, 1200, 85, undefined);
      // Ensure /image/upload/ occurs exactly once
      const count = (url.match(/\/image\/upload\//g) || []).length;
      assert.equal(count, 1, "Expected /image/upload/ to appear exactly once");
      // Check quality parameter override
      assert.ok(url.includes("q_85"), "Expected explicit quality q_85");
      assert.ok(url.includes("w_1200"), "Expected width w_1200");
      assert.ok(!url.includes("w_400"), "Old transform w_400 should be removed");
      assert.equal(
        url,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_85,dpr_auto,w_1200,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("caps width at 1600px to prevent oversized transformations", () => {
      const url = buildCloudinaryDeliveryUrl(SAMPLE_ASSET, 3840, undefined, undefined);
      assert.ok(url.includes("w_1600"), "Width should be clamped to 1600");
    });
  });

  describe("imageLoader global loader integration", () => {
    it("delivers standard Cloudinary URL when NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN is unset", () => {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;
      const result = imageLoader({ src: SAMPLE_ASSET, width: 800 });
      assert.equal(
        result,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("delivers standard Cloudinary URL when NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN is empty string", () => {
      process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN = "";
      const result = imageLoader({ src: SAMPLE_ASSET, width: 800 });
      assert.equal(
        result,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("delivers custom delivery URL when NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN is set", () => {
      process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN = "img.angkon.net";
      const result = imageLoader({ src: SAMPLE_ASSET, width: 800 });
      assert.equal(
        result,
        `https://img.angkon.net/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("reverts old stored custom domain URLs to standard Cloudinary when env is unset", () => {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;
      const storedWithCustom = `https://img.angkon.net/${CLOUD_NAME}/image/upload/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`;
      const result = imageLoader({ src: storedWithCustom, width: 800 });
      assert.equal(
        result,
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
      );
    });

    it("reverts stored path-less images.nexcraftly.com URLs using NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", () => {
      const prevCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      delete process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = CLOUD_NAME;
      try {
        const storedLegacy =
          "https://images.nexcraftly.com/image/upload/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp";
        const result = imageLoader({ src: storedLegacy, width: 800 });
        assert.equal(
          result,
          `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,dpr_auto,w_800,c_limit/v1795155578/ANGKON/CATEGORIES/ETHNIC_WEAR/GUZEL/file_xg0qnq.webp`
        );
      } finally {
        if (prevCloudName === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        else process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prevCloudName;
      }
    });

    it("routes non-Cloudinary remote images through wsrv.nl", () => {
      const wpImage = "https://netbazarbd.net/wp-content/uploads/2026/01/banner.png";
      const result = imageLoader({ src: wpImage, width: 400, quality: 80 });
      assert.ok(result.startsWith("https://wsrv.nl/?url="));
      assert.ok(result.includes("w=400"));
      assert.ok(result.includes("q=80"));
      assert.ok(result.includes("output=webp"));
    });

    it("preserves local and dev assets untouched except for width query", () => {
      const localImage = "/images/logo.png";
      const result = imageLoader({ src: localImage, width: 200 });
      assert.equal(result, "/images/logo.png?w=200");

      const localWithQuery = "/images/logo.png?v=2";
      const resultWithQuery = imageLoader({ src: localWithQuery, width: 200 });
      assert.equal(resultWithQuery, "/images/logo.png?v=2&w=200");
    });
  });
});
