import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const APP_DATA_DIR = 'C:/Users/Saddam/.gemini/antigravity/brain/bbac8cd2-1b4d-4776-a247-1491ca0947ea/';

function createSvgText(title, fontSize = 76, letterSpacing = 26, x = 520, y = 385) {
  return Buffer.from(`
    <svg width="1700" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="6.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <text x="${x}" y="${y}" font-family="Montserrat, Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="${letterSpacing}" filter="url(#sh)">${title}</text>
    </svg>
  `);
}

async function renderRowExtendedBanner({
  sourceFile,
  title,
  fontSize = 76,
  letterSpacing = 26,
  textX = 510,
  textY = 385,
  outputName,
  crop = null,
}) {
  let imgPipeline = sharp(sourceFile);
  if (crop) {
    imgPipeline = imgPipeline.extract(crop);
  }
  const scaled = await imgPipeline.resize({ height: 700 }).toBuffer();
  const { data, info } = await sharp(scaled).raw().toBuffer({ resolveWithObject: true });

  const canvasW = 1700;
  const canvasH = 700;
  const out = Buffer.alloc(canvasW * canvasH * 3);
  const imgLeft = canvasW - info.width;

  for (let y = 0; y < canvasH; y++) {
    let rSum = 0, gSum = 0, bSum = 0;
    const sampleW = Math.min(20, info.width);
    for (let sx = 0; sx < sampleW; sx++) {
      const srcIdx = (y * info.width + sx) * 3;
      rSum += data[srcIdx];
      gSum += data[srcIdx + 1];
      bSum += data[srcIdx + 2];
    }
    const r0 = Math.round(rSum / sampleW);
    const g0 = Math.round(gSum / sampleW);
    const b0 = Math.round(bSum / sampleW);

    for (let x = 0; x < imgLeft; x++) {
      const dst = (y * canvasW + x) * 3;
      out[dst] = r0;
      out[dst + 1] = g0;
      out[dst + 2] = b0;
    }
    for (let x = 0; x < info.width; x++) {
      const src = (y * info.width + x) * 3;
      const dst = (y * canvasW + (imgLeft + x)) * 3;
      out[dst] = data[src];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src + 2];
    }
  }

  // Smooth seam blending
  const blendW = 34;
  for (let y = 0; y < canvasH; y++) {
    for (let i = 0; i < blendW; i++) {
      const x = imgLeft - blendW / 2 + i;
      if (x < 0 || x >= canvasW) continue;
      const prog = i / blendW;
      const leftIdx = (y * canvasW + Math.max(0, imgLeft - blendW / 2)) * 3;
      const rightIdx = (y * canvasW + Math.min(canvasW - 1, imgLeft + blendW / 2)) * 3;
      const dstIdx = (y * canvasW + x) * 3;
      out[dstIdx] = Math.round(out[leftIdx] * (1 - prog) + out[rightIdx] * prog);
      out[dstIdx + 1] = Math.round(out[leftIdx + 1] * (1 - prog) + out[rightIdx + 1] * prog);
      out[dstIdx + 2] = Math.round(out[leftIdx + 2] * (1 - prog) + out[rightIdx + 2] * prog);
    }
  }

  const svg = createSvgText(title, fontSize, letterSpacing, textX, textY);
  const composite = await sharp(out, { raw: { width: canvasW, height: canvasH, channels: 3 } })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  const pngPath = path.join('public', 'banners', `${outputName}.png`);
  const webpPath = path.join('public', 'banners', `${outputName}.webp`);

  await sharp(composite).toFile(pngPath);
  await sharp(composite).webp({ quality: 92 }).toFile(webpPath);

  console.log(`Generated: ${pngPath} and ${webpPath}`);
}

async function renderFeatheredBanner({
  sourceFile,
  title,
  fontSize = 76,
  letterSpacing = 26,
  textX = 520,
  textY = 385,
  outputName,
  crop = null,
  bgGradColors = ['#EDEDF0', '#F5F5F7', '#FFFFFF'],
  fadeW = 50,
}) {
  let imgPipeline = sharp(sourceFile);
  if (crop) {
    imgPipeline = imgPipeline.extract(crop);
  }
  const scaled = await imgPipeline.resize({ height: 700 }).toBuffer();
  const { data, info } = await sharp(scaled).raw().toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const srcIdx = (y * info.width + x) * info.channels;
      const dstIdx = (y * info.width + x) * 4;
      rgba[dstIdx] = data[srcIdx];
      rgba[dstIdx + 1] = data[srcIdx + 1];
      rgba[dstIdx + 2] = data[srcIdx + 2];
      let a = 255;
      if (x < fadeW) {
        a = Math.round((x / fadeW) * 255);
      }
      rgba[dstIdx + 3] = a;
    }
  }

  const feathered = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  const svgBg = `
    <svg width="1700" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${bgGradColors[0]}"/>
          <stop offset="50%" stop-color="${bgGradColors[1]}"/>
          <stop offset="100%" stop-color="${bgGradColors[2]}"/>
        </linearGradient>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="6.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <rect width="1700" height="700" fill="url(#bgGrad)"/>
      <text x="${textX}" y="${textY}" font-family="Montserrat, Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="${letterSpacing}" filter="url(#sh)">${title}</text>
    </svg>
  `;

  const composite = await sharp(Buffer.from(svgBg))
    .composite([
      {
        input: feathered,
        top: 0,
        left: 1700 - info.width,
      },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  const pngPath = path.join('public', 'banners', `${outputName}.png`);
  const webpPath = path.join('public', 'banners', `${outputName}.webp`);

  await sharp(composite).toFile(pngPath);
  await sharp(composite).webp({ quality: 92 }).toFile(webpPath);

  console.log(`Generated: ${pngPath} and ${webpPath}`);
}

async function run() {
  console.log('--- Generating All 6 Category Banners (1700x700) ---');

  // 1. Half Sleeves
  await renderRowExtendedBanner({
    sourceFile: path.join(APP_DATA_DIR, 'half_sleeves_model_1791997151197.jpg'),
    title: 'HALF SLEEVES',
    fontSize: 68,
    letterSpacing: 24,
    textX: 510,
    textY: 388,
    outputName: 'half-sleeves',
  });

  // 2. Full Sleeves
  await renderRowExtendedBanner({
    sourceFile: path.join(APP_DATA_DIR, 'full_sleeves_model_1791997188716.jpg'),
    title: 'FULL SLEEVES',
    fontSize: 68,
    letterSpacing: 24,
    textX: 510,
    textY: 388,
    outputName: 'full-sleeves',
  });

  // 3. Pants
  await renderRowExtendedBanner({
    sourceFile: path.join(APP_DATA_DIR, 'pants_model_1791997218499.jpg'),
    title: 'PANTS',
    fontSize: 78,
    letterSpacing: 28,
    textX: 530,
    textY: 388,
    outputName: 'pants',
  });

  // 4. Tees
  await renderFeatheredBanner({
    sourceFile: path.join('public', 'banners', 'candidate_tee.jpg'),
    crop: { left: 745, top: 40, width: 955, height: 1090 },
    title: 'TEES',
    fontSize: 78,
    letterSpacing: 28,
    textX: 530,
    textY: 388,
    outputName: 'tees',
    bgGradColors: ['#EDEDF0', '#F5F5F7', '#FFFFFF'],
    fadeW: 45,
  });

  // 5. Polos
  await renderFeatheredBanner({
    sourceFile: path.join('public', 'banners', 'unsplash_polo_navy.jpg'),
    title: 'POLO',
    fontSize: 78,
    letterSpacing: 28,
    textX: 530,
    textY: 388,
    outputName: 'polos',
    bgGradColors: ['#E5E4E0', '#EBEAE6', '#F1EFEA'],
    fadeW: 50,
  });

  // 6. Tops
  await renderRowExtendedBanner({
    sourceFile: path.join('public', 'banners', 'cand_top1.jpg'),
    crop: { left: 400, top: 100, width: 1300, height: 1650 },
    title: 'TOPS',
    fontSize: 78,
    letterSpacing: 28,
    textX: 530,
    textY: 388,
    outputName: 'tops',
  });

  console.log('--- All 6 Category Banners Successfully Generated! ---');
}

run().catch(console.error);
