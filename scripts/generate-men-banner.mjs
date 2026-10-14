import sharp from 'sharp';
import fs from 'fs';

async function makePerfectMenBanner() {
  const uploadedPath = 'C:/Users/Saddam/.gemini/antigravity/brain/bbac8cd2-1b4d-4776-a247-1491ca0947ea/.user_uploaded/media_1791993530065_06f77ca8.jpg';

  const { data, info } = await sharp(uploadedPath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;

  // 1. Precise segmentation of studio background
  const isBg = new Float32Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed with outer perimeter
  for (let x = 0; x < width; x++) {
    queue.push(0 * width + x);
    queue.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width + 0);
    queue.push(y * width + (width - 1));
  }

  for (const idx of queue) {
    visited[idx] = 1;
    isBg[idx] = 1.0;
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
    ];

    for (const n of neighbors) {
      if (n === -1 || visited[n] === 1) continue;

      const pIdx = n * info.channels;
      const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);

      // Studio background: high luminance and low saturation
      if (lum > 224 && sat < 20) {
        visited[n] = 1;
        isBg[n] = 1.0;
        queue.push(n);
      }
    }
  }

  // Construct RGBA with pristine cutout
  const outRgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    outRgba[dstIdx] = data[srcIdx];
    outRgba[dstIdx + 1] = data[srcIdx + 1];
    outRgba[dstIdx + 2] = data[srcIdx + 2];
    outRgba[dstIdx + 3] = isBg[i] > 0.5 ? 0 : 255;
  }

  // Extract model: hair top is at y=206, bottom at y=1023
  // Bounding box: x: 145 to 575, y: 198 to 1024
  const croppedModel = await sharp(outRgba, { raw: { width, height, channels: 4 } })
    .extract({ left: 145, top: 198, width: 435, height: 826 })
    // Scale model so height fits nicely in 700px canvas with ~25px headroom
    .resize({ height: 675, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const modelMeta = await sharp(croppedModel).metadata();
  console.log('Model ready, scaled size:', modelMeta.width, 'x', modelMeta.height);

  // SVG background + typography calibrated to women-banner.png
  const svgCanvas = `
  <svg width="1700" height="700" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="studioGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#DEE0E4"/>
        <stop offset="28%" stop-color="#E8EAEF"/>
        <stop offset="60%" stop-color="#F4F5F7"/>
        <stop offset="92%" stop-color="#FCFCFC"/>
        <stop offset="100%" stop-color="#FFFFFF"/>
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.045"/>
      </radialGradient>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="5" stdDeviation="6.5" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    <rect width="1700" height="700" fill="url(#studioGrad)"/>
    <rect width="1700" height="700" fill="url(#vignette)"/>
    <!-- "M E N" Typography calibrated to match "W O M E N" in women-banner.png -->
    <text x="540" y="388" font-family="Montserrat, Arial, sans-serif" font-size="78" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="28" filter="url(#shadow)">M E N</text>
  </svg>
  `;

  const finalPngBuffer = await sharp(Buffer.from(svgCanvas))
    .composite([
      {
        input: croppedModel,
        top: 25,
        left: 1700 - modelMeta.width - 165,
      },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // Save both PNG and WebP to public/banners/
  await sharp(finalPngBuffer).toFile('public/banners/men-banner.png');
  await sharp(finalPngBuffer).webp({ quality: 92 }).toFile('public/banners/men-banner.webp');

  console.log('Successfully written men-banner.png and men-banner.webp!');
}

makePerfectMenBanner().catch(console.error);
