/** Mutable pixel settings for the pixel-settings stub used by API route tests. */

export const pixelState = {
  pixelId: "",
  capiAccessToken: "",
  marketingApiAccessToken: "",
};

export function resetPixelSettings() {
  pixelState.pixelId = "";
  pixelState.capiAccessToken = "";
  pixelState.marketingApiAccessToken = "";
}

export async function getPixelSettings() {
  return { ...pixelState };
}
