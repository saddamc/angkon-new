import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizeKnownCloudinaryProductUrl,
  normalizeTawakkalWadaImageReference,
} from "../src/lib/cloudinary-tawakkal-assets";
import imageLoader from "../src/lib/image-loader";

const cloud = "https://res.cloudinary.com/drtzgyetn/image/upload";

describe("Tawakkal Wada Cloudinary image recovery", () => {
  it("rewrites legacy versioned product URLs to the current shorter asset paths", () => {
    const stale = `${cloud}/w_256,q_75,f_auto/v1791652410/ANGKON/WOMEN/ETHNIC/tawakkal-wada-midnight-black/3.jpg`;
    assert.equal(
      normalizeKnownCloudinaryProductUrl(stale),
      `${cloud}/ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/tawakkal-wada-midnight-black/file_rlbrdo.webp`
    );
  });

  it("repairs stale database URLs at the global Next image loader too", () => {
    const stale = `${cloud}/v1791652410/ANGKON/WOMEN/ETHNIC/tawakkal-wada-midnight-black/3.jpg`;
    assert.equal(
      imageLoader({ src: stale, width: 256, quality: 75 }),
      `${cloud}/f_auto,q_auto,dpr_auto,w_256,c_limit/ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/tawakkal-wada-midnight-black/file_rlbrdo.webp`
    );
  });

  it("repairs database image URLs and public IDs using the product slug", () => {
    const oldImage = {
      src: `${cloud}/v1791652425/ANGKON/WOMEN/ETHNIC/tawakkal-wada-royal-navy-blue/2.jpg`,
      public_id: "ANGKON/WOMEN/ETHNIC/tawakkal-wada-royal-navy-blue/2",
    };
    assert.deepEqual(
      normalizeTawakkalWadaImageReference("tawakkal-wada-royal-navy-blue", oldImage),
      {
        src: `${cloud}/ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/tawakkal-wada-royal-navy-blue/file_fkykan.webp`,
        public_id:
          "ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/tawakkal-wada-royal-navy-blue/file_fkykan",
      }
    );
  });

  it("leaves unrelated and already-current image URLs unchanged", () => {
    const otherProduct = `${cloud}/v123/ANGKON/OTHER/product/1.jpg`;
    const current = `${cloud}/ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/tawakkal-wada-midnight-black/file_ckspkm.webp`;
    assert.equal(normalizeKnownCloudinaryProductUrl(otherProduct), otherProduct);
    assert.equal(normalizeKnownCloudinaryProductUrl(current), current);
  });

  it("keeps the static fallback catalog on valid short asset URLs", () => {
    const products = JSON.parse(
      fs.readFileSync("src/data/real-products.json", "utf8")
    ) as Array<{ slug: string; images: Array<{ src: string; public_id?: string }> }>;
    const wadaProducts = products.filter((product) => product.slug.startsWith("tawakkal-wada-"));

    assert.equal(wadaProducts.length, 7);
    for (const product of wadaProducts) {
      assert.ok(product.images.length > 0, `${product.slug} needs images`);
      for (const image of product.images) {
        assert.match(image.src, /\/ANGKON\/ETHNIC_WEAR\/TAWAKKAL_WADA\/[^/]+\/file_[a-z0-9]+\.webp$/);
        assert.ok(!image.src.includes("/v179165"), "static data must not contain dead versioned URLs");
      }
    }
  });
});
