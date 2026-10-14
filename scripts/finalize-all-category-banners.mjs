import sharp from 'sharp';
import path from 'path';

const APP_DATA_DIR = 'C:/Users/Saddam/.gemini/antigravity/brain/bbac8cd2-1b4d-4776-a247-1491ca0947ea';

function createSvgText(title, fontSize = 78, letterSpacing = 28, textX = 520, textY = 388) {
  return Buffer.from(`
    <svg width="1700" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="6.5" flood-color="#000000" flood-opacity="0.65"/>
        </filter>
      </defs>
      <text x="${textX}" y="${textY}" font-family="Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="${letterSpacing}" filter="url(#sh)">${title}</text>
    </svg>
  `);
}

async function saveBanner(rawBuffer, svg, name) {
  const composite = await sharp(rawBuffer, { raw: { width: 1700, height: 700, channels: 3 } })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  const pngPath = path.join('public', 'banners', `${name}.png`);
  const webpPath = path.join('public', 'banners', `${name}.webp`);

  await sharp(composite).toFile(pngPath);
  await sharp(composite).webp({ quality: 92 }).toFile(webpPath);
  console.log(`[SUCCESS] Generated ${name}.webp & ${name}.png`);
}

// 1. TOPS
async function generateTops() {
  const file = 'public/banners/cand_top_chair.jpg';
  const scaled = await sharp(file)
    .extract({ left: 100, top: 60, width: 1400, height: 1600 })
    .resize({ height: 700 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canvasW = 1700;
  const canvasH = 700;
  const out = Buffer.alloc(canvasW * canvasH * 3);
  const modelLeft = canvasW - scaled.info.width;

  for (let y = 0; y < canvasH; y++) {
    let rSum = 0, gSum = 0, bSum = 0;
    const sampleW = 10;
    for (let sx = 0; sx < sampleW; sx++) {
      const idx = (y * scaled.info.width + sx) * 3;
      rSum += scaled.data[idx];
      gSum += scaled.data[idx + 1];
      bSum += scaled.data[idx + 2];
    }
    const r0 = Math.round(rSum / sampleW);
    const g0 = Math.round(gSum / sampleW);
    const b0 = Math.round(bSum / sampleW);

    for (let x = 0; x < modelLeft; x++) {
      const dst = (y * canvasW + x) * 3;
      out[dst] = r0; out[dst + 1] = g0; out[dst + 2] = b0;
    }
    for (let x = 0; x < scaled.info.width; x++) {
      const src = (y * scaled.info.width + x) * 3;
      const dst = (y * canvasW + (modelLeft + x)) * 3;
      out[dst] = scaled.data[src];
      out[dst + 1] = scaled.data[src + 1];
      out[dst + 2] = scaled.data[src + 2];
    }
  }

  const blendW = 20;
  for (let y = 0; y < canvasH; y++) {
    for (let i = 0; i < blendW; i++) {
      const x = modelLeft - blendW / 2 + i;
      if (x < 0 || x >= canvasW) continue;
      const prog = i / blendW;
      const lIdx = (y * canvasW + Math.max(0, modelLeft - blendW / 2)) * 3;
      const rIdx = (y * canvasW + Math.min(canvasW - 1, modelLeft + blendW / 2)) * 3;
      const dstIdx = (y * canvasW + x) * 3;
      out[dstIdx] = Math.round(out[lIdx] * (1 - prog) + out[rIdx] * prog);
      out[dstIdx + 1] = Math.round(out[lIdx + 1] * (1 - prog) + out[rIdx + 1] * prog);
      out[dstIdx + 2] = Math.round(out[lIdx + 2] * (1 - prog) + out[rIdx + 2] * prog);
    }
  }

  const svg = createSvgText('TOPS', 78, 28, 520, 388);
  await saveBanner(out, svg, 'tops');
}

// 2. FULL SLEEVES
async function generateFullSleeves() {
  const scaled = await sharp('public/banners/cand_shirt_35415004.jpg')
    .extract({ left: 50, top: 80, width: 1550, height: 1600 })
    .resize({ height: 700 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canvasW = 1700;
  const canvasH = 700;
  const out = Buffer.alloc(canvasW * canvasH * 3);
  const modelLeft = canvasW - scaled.info.width;

  for (let y = 0; y < canvasH; y++) {
    let rSum = 0, gSum = 0, bSum = 0;
    const sampleW = 10;
    for (let sx = 0; sx < sampleW; sx++) {
      const idx = (y * scaled.info.width + sx) * 3;
      rSum += scaled.data[idx];
      gSum += scaled.data[idx + 1];
      bSum += scaled.data[idx + 2];
    }
    const r0 = Math.round(rSum / sampleW);
    const g0 = Math.round(gSum / sampleW);
    const b0 = Math.round(bSum / sampleW);

    for (let x = 0; x < modelLeft; x++) {
      const dst = (y * canvasW + x) * 3;
      out[dst] = r0; out[dst + 1] = g0; out[dst + 2] = b0;
    }
    for (let x = 0; x < scaled.info.width; x++) {
      const src = (y * scaled.info.width + x) * 3;
      const dst = (y * canvasW + (modelLeft + x)) * 3;
      out[dst] = scaled.data[src];
      out[dst + 1] = scaled.data[src + 1];
      out[dst + 2] = scaled.data[src + 2];
    }
  }

  const blendW = 20;
  for (let y = 0; y < canvasH; y++) {
    for (let i = 0; i < blendW; i++) {
      const x = modelLeft - blendW / 2 + i;
      if (x < 0 || x >= canvasW) continue;
      const prog = i / blendW;
      const lIdx = (y * canvasW + Math.max(0, modelLeft - blendW / 2)) * 3;
      const rIdx = (y * canvasW + Math.min(canvasW - 1, modelLeft + blendW / 2)) * 3;
      const dstIdx = (y * canvasW + x) * 3;
      out[dstIdx] = Math.round(out[lIdx] * (1 - prog) + out[rIdx] * prog);
      out[dstIdx + 1] = Math.round(out[lIdx + 1] * (1 - prog) + out[rIdx + 1] * prog);
      out[dstIdx + 2] = Math.round(out[lIdx + 2] * (1 - prog) + out[rIdx + 2] * prog);
    }
  }

  const svg = createSvgText('FULL SLEEVES', 72, 24, 510, 388);
  await saveBanner(out, svg, 'full-sleeves');
}

// 3. TEES
async function generateTees() {
  const dir = `${APP_DATA_DIR}/.tempmediaStorage/`;
  const file = `${dir}media_1791998754725_35917f49.jpg`;
  
  const scaled = await sharp(file)
    .extract({ left: 40, top: 40, width: 1660, height: 1080 })
    .resize({ height: 700 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canvasW = 1700;
  const canvasH = 700;
  const out = Buffer.alloc(canvasW * canvasH * 3);
  const modelsLeft = canvasW - scaled.info.width;

  for (let y = 0; y < canvasH; y++) {
    const src0 = (y * scaled.info.width + 0) * 3;
    const r0 = scaled.data[src0], g0 = scaled.data[src0 + 1], b0 = scaled.data[src0 + 2];
    for (let x = 0; x < modelsLeft; x++) {
      const dst = (y * canvasW + x) * 3;
      out[dst] = r0; out[dst + 1] = g0; out[dst + 2] = b0;
    }
    for (let x = 0; x < scaled.info.width; x++) {
      const src = (y * scaled.info.width + x) * 3;
      const dst = (y * canvasW + (modelsLeft + x)) * 3;
      out[dst] = scaled.data[src];
      out[dst + 1] = scaled.data[src + 1];
      out[dst + 2] = scaled.data[src + 2];
    }
  }

  const blendW = 20;
  for (let y = 0; y < canvasH; y++) {
    for (let i = 0; i < blendW; i++) {
      const x = modelsLeft - blendW / 2 + i;
      if (x < 0 || x >= canvasW) continue;
      const prog = i / blendW;
      const lIdx = (y * canvasW + Math.max(0, modelsLeft - blendW / 2)) * 3;
      const rIdx = (y * canvasW + Math.min(canvasW - 1, modelsLeft + blendW / 2)) * 3;
      const dstIdx = (y * canvasW + x) * 3;
      out[dstIdx] = Math.round(out[lIdx] * (1 - prog) + out[rIdx] * prog);
      out[dstIdx + 1] = Math.round(out[lIdx + 1] * (1 - prog) + out[rIdx + 1] * prog);
      out[dstIdx + 2] = Math.round(out[lIdx + 2] * (1 - prog) + out[rIdx + 2] * prog);
    }
  }

  const svg = createSvgText('TEES', 78, 28, 320, 388);
  await saveBanner(out, svg, 'tees');
}

// 4. PANTS
async function generatePants() {
  const file = `${APP_DATA_DIR}/pants_model_1791997218499.jpg`;
  const scaled = await sharp(file)
    .extract({ left: 280, top: 0, width: 1096, height: 768 })
    .resize({ height: 700 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const canvasW = 1700;
  const canvasH = 700;
  const out = Buffer.alloc(canvasW * canvasH * 3);
  const modelLeft = canvasW - scaled.info.width;

  for (let y = 0; y < canvasH; y++) {
    let rSum = 0, gSum = 0, bSum = 0;
    const sampleW = 15;
    for (let sx = 0; sx < sampleW; sx++) {
      const idx = (y * scaled.info.width + sx) * 3;
      rSum += scaled.data[idx];
      gSum += scaled.data[idx + 1];
      bSum += scaled.data[idx + 2];
    }
    const r0 = Math.round(rSum / sampleW);
    const g0 = Math.round(gSum / sampleW);
    const b0 = Math.round(bSum / sampleW);

    for (let x = 0; x < modelLeft; x++) {
      const dst = (y * canvasW + x) * 3;
      out[dst] = r0; out[dst + 1] = g0; out[dst + 2] = b0;
    }
    for (let x = 0; x < scaled.info.width; x++) {
      const src = (y * scaled.info.width + x) * 3;
      const dst = (y * canvasW + (modelLeft + x)) * 3;
      out[dst] = scaled.data[src];
      out[dst + 1] = scaled.data[src + 1];
      out[dst + 2] = scaled.data[src + 2];
    }
  }

  const blendW = 24;
  for (let y = 0; y < canvasH; y++) {
    for (let i = 0; i < blendW; i++) {
      const x = modelLeft - blendW / 2 + i;
      if (x < 0 || x >= canvasW) continue;
      const prog = i / blendW;
      const lIdx = (y * canvasW + Math.max(0, modelLeft - blendW / 2)) * 3;
      const rIdx = (y * canvasW + Math.min(canvasW - 1, modelLeft + blendW / 2)) * 3;
      const dstIdx = (y * canvasW + x) * 3;
      out[dstIdx] = Math.round(out[lIdx] * (1 - prog) + out[rIdx] * prog);
      out[dstIdx + 1] = Math.round(out[lIdx + 1] * (1 - prog) + out[rIdx + 1] * prog);
      out[dstIdx + 2] = Math.round(out[lIdx + 2] * (1 - prog) + out[rIdx + 2] * prog);
    }
  }

  const svg = createSvgText('PANTS', 78, 28, 420, 388);
  await saveBanner(out, svg, 'pants');
}

// 5. HALF SLEEVES
async function generateHalfSleeves() {
  const file = `${APP_DATA_DIR}/.user_uploaded/media_1792004114510_d038d0bf.png`;

  // Crop out red frame (8px left/right, 7px top/bottom) and resize 1008x415 -> 1700x700
  const base = await sharp(file)
    .extract({ left: 8, top: 15, width: 1008, height: 415 })
    .resize(1700, 700)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const svg = createSvgText('HALF SLEEVES', 70, 24, 400, 388);
  await saveBanner(base.data, svg, 'half-sleeves');
}

async function run() {
  console.log('--- Finalizing All Category Banners (1700x700 WebP + PNG) ---');
  await generateTops();
  await generateFullSleeves();
  await generateTees();
  await generatePants();
  await generateHalfSleeves();
  console.log('--- All Category Banners Finalized Successfully! ---');
}

run().catch(console.error);
