export type CropMode = "3:4" | "1:1" | "fit";
export type CropAlign = "top" | "center" | "bottom";

/**
 * Perform client-side canvas crop / fit transform on an image.
 * Returns a JPEG Blob ready for upload.
 */
export async function cropImageCanvas(
  imageUrl: string,
  mode: CropMode,
  align: CropAlign
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      if (mode === "fit") {
        const targetW = 1200;
        const targetH = 1600;
        canvas.width = targetW;
        canvas.height = targetH;

        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, targetW, targetH);

        const imgAspect = img.width / img.height;
        const targetAspect = targetW / targetH;

        let drawW = targetW;
        let drawH = targetH;
        let drawX = 0;
        let drawY = 0;

        if (imgAspect > targetAspect) {
          drawW = targetW;
          drawH = targetW / imgAspect;
          drawX = 0;
          drawY = (targetH - drawH) / 2;
        } else {
          drawH = targetH;
          drawW = targetH * imgAspect;
          drawX = (targetW - drawW) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        const targetAspect = mode === "3:4" ? 3 / 4 : 1;
        const targetW = 1200;
        const targetH = mode === "3:4" ? 1600 : 1200;
        canvas.width = targetW;
        canvas.height = targetH;

        const imgAspect = img.width / img.height;
        let sX = 0;
        let sY = 0;
        let sW = img.width;
        let sH = img.height;

        if (imgAspect > targetAspect) {
          sW = img.height * targetAspect;
          if (align === "center") {
            sX = (img.width - sW) / 2;
          } else if (align === "top") {
            sX = 0;
          } else {
            sX = img.width - sW;
          }
        } else {
          sH = img.width / targetAspect;
          if (align === "top") {
            sY = 0;
          } else if (align === "center") {
            sY = (img.height - sH) / 2;
          } else {
            sY = img.height - sH;
          }
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas blob conversion failed"));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = imageUrl;
  });
}
