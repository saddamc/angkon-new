import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { extractPublicIdFromUrl } from "../src/lib/cloudinary";

describe("Cloudinary public_id extraction", () => {
  const previousDomain = process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;

  afterEach(() => {
    if (previousDomain === undefined) delete process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;
    else process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN = previousDomain;
  });

  it("extracts a public_id from the configured custom delivery hostname", () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN = "images.nexcraftly.com";
    assert.equal(
      extractPublicIdFromUrl(
        "https://images.nexcraftly.com/image/upload/f_auto,q_auto/v123/ANGKON/WOMEN/product/image.webp",
      ),
      "ANGKON/WOMEN/product/image",
    );
  });

  it("extracts a public_id from a standard Cloudinary URL with transformations", () => {
    assert.equal(
      extractPublicIdFromUrl(
        "https://res.cloudinary.com/drtzgyetn/image/upload/w_400,q_auto/v123/ANGKON/WOMEN/product/image.webp",
      ),
      "ANGKON/WOMEN/product/image",
    );
  });

  it("does not treat arbitrary remote URLs as Cloudinary assets", () => {
    assert.equal(extractPublicIdFromUrl("https://example.com/image.webp"), "");
  });
});
