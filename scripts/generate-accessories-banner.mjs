import sharp from 'sharp';
import fs from 'fs';

async function generateProductionAccessoriesBanner() {
  const uploadedPath = 'C:/Users/Saddam/.gemini/antigravity/brain/bbac8cd2-1b4d-4776-a247-1491ca0947ea/.user_uploaded/media_1791993728086_f5e70dba.jpg';

  // 1. Crop to focus on the luxury bag + heels + ambient perfume & mirror
  // Crop from y=45 to y=885 (height 840) to keep the full handle, bag, shoes, and table reflection
  const targetH = 700;
  const cropH = 840;
  const scale = targetH / cropH;
  const targetW = Math.round(808 * scale); // 673px

  const scene = await sharp(uploadedPath)
    .extract({ left: 0, top: 45, width: 808, height: cropH })
    .resize({ width: targetW, height: targetH, kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  const { data: rgb, info } = await sharp(scene).raw().toBuffer({ resolveWithObject: true });

  // 2. We apply a 2D smooth feather on the left edge AND bottom-left corner
  // The handbag starts at x = 110, so everything x >= 110 has alpha = 255 (100% solid & untouched)
  // From x = 0 to x = 110, we fade alpha smoothly
  // Also, at the bottom table (y > 520, x < 220), we apply a dark vignette blend so the bright table edge dissolves into deep shadow
  const rgba = Buffer.alloc(info.width * info.height * 4);
  const fadeW = 100;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const dstIdx = (y * info.width + x) * 4;

      let r = rgb[idx];
      let g = rgb[idx + 1];
      let b = rgb[idx + 2];

      // Alpha fade on left edge
      let alpha = 255;
      if (x < fadeW) {
        const t = x / fadeW;
        // Cosine curve: 0 at x=0, 1 at x=fadeW
        const s = 0.5 - 0.5 * Math.cos(t * Math.PI);
        alpha = Math.round(s * 255);
      }

      // If at bottom table (y > 520) and towards left (x < 220), blend with dark burgundy
      if (y > 520 && x < 220) {
        const xDist = (220 - x) / 220;
        const yDist = (y - 520) / (info.height - 520);
        const shadowStrength = Math.min(1.0, xDist * yDist * 1.6);
        // Blend towards #240403 (deep royal burgundy)
        r = Math.round(r * (1 - shadowStrength) + 36 * shadowStrength);
        g = Math.round(g * (1 - shadowStrength) + 4 * shadowStrength);
        b = Math.round(b * (1 - shadowStrength) + 3 * shadowStrength);
      }

      rgba[dstIdx] = r;
      rgba[dstIdx + 1] = g;
      rgba[dstIdx + 2] = b;
      rgba[dstIdx + 3] = alpha;
    }
  }

  const fadedScene = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  const sceneLeft = 1700 - info.width;

  // Background SVG in ANGKON Royal Burgundy & Gold ambient glow
  const svgBg = `
  <svg width="1700" height="700" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="royalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1B0201"/>
        <stop offset="35%" stop-color="#280403"/>
        <stop offset="65%" stop-color="#340605"/>
        <stop offset="85%" stop-color="#280504"/>
        <stop offset="100%" stop-color="#200302"/>
      </linearGradient>
      <radialGradient id="goldGlow" cx="32%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#E1B76F" stop-opacity="0.14"/>
        <stop offset="50%" stop-color="#E1B76F" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
    </defs>
    <rect width="1700" height="700" fill="url(#royalGrad)"/>
    <rect width="1700" height="700" fill="url(#goldGlow)"/>
    <!-- Clean, bold, tracked out typography matching Women, Men & Ethnic Wear banners -->
    <text x="510" y="380" font-family="Montserrat, Arial, sans-serif" font-size="64" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="26" filter="url(#shadow)">ACCESSORIES</text>
  </svg>
  `;

  const finalPng = await sharp(Buffer.from(svgBg))
    .composite([
      {
        input: fadedScene,
        top: 0,
        left: sceneLeft,
      }
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // Save to public/banners/
  await sharp(finalPng).toFile('public/banners/accessories.png');
  await sharp(finalPng).webp({ quality: 92 }).toFile('public/banners/accessories.webp');

  console.log('Successfully written accessories.png and accessories.webp!');
}

generateProductionAccessoriesBanner().catch(console.error);
