import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const localProductsBase = path.join(rootDir, 'public', 'products', 'tawakkal-wada');
const productsJsonPath = path.join(rootDir, 'src', 'data', 'real-products.json');
const categoriesJsonPath = path.join(rootDir, 'src', 'data', 'real-categories.json');

const products = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
const categories = JSON.parse(fs.readFileSync(categoriesJsonPath, 'utf8'));

// Cloudinary hierarchy:
// ANGKON / WOMEN / ETHNIC / <product-slug> / <filename>
const PROJECT_NAME = 'ANGKON';
const CATEGORY_NAME = 'WOMEN';
const SUBCATEGORY_NAME = 'ETHNIC';

const productFolders = [
  { slug: 'tawakkal-wada-midnight-black', localDir: 'midnight-black' },
  { slug: 'tawakkal-wada-deep-emerald-green', localDir: 'deep-emerald-green' },
  { slug: 'tawakkal-wada-dark-coffee-brown', localDir: 'dark-coffee-brown' },
  { slug: 'tawakkal-wada-royal-navy-blue', localDir: 'royal-navy-blue' },
  { slug: 'tawakkal-wada-deep-plum-purple', localDir: 'deep-plum-purple' },
  { slug: 'tawakkal-wada-deep-teal-blue', localDir: 'deep-teal-blue' },
  { slug: 'tawakkal-wada-deep-raspberry-magenta', localDir: 'deep-raspberry-magenta' },
];

async function uploadFile(filePath, folder, publicId) {
  console.log(`Uploading ${filePath} -> ${folder}/${publicId}...`);
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
  });
}

async function run() {
  console.log('--- Starting Cloudinary Upload ---');
  console.log('Cloud:', process.env.CLOUDINARY_CLOUD_NAME);

  // 1. Upload Size Chart
  const sizeChartPath = path.join(localProductsBase, 'size-chart.jpeg');
  let sizeChartCloudUrl = '';
  if (fs.existsSync(sizeChartPath)) {
    const sizeFolder = `${PROJECT_NAME}/${CATEGORY_NAME}/${SUBCATEGORY_NAME}`;
    const sizeRes = await uploadFile(sizeChartPath, sizeFolder, 'size-chart');
    sizeChartCloudUrl = sizeRes.secure_url;
    console.log('Size Chart uploaded:', sizeChartCloudUrl);
  }

  // 2. Upload each product's images
  const uploadedMap = {}; // slug -> array of { id, src, public_id, name, alt }

  for (const item of productFolders) {
    const localDir = path.join(localProductsBase, item.localDir);
    if (!fs.existsSync(localDir)) {
      console.warn(`Local directory not found: ${localDir}`);
      continue;
    }

    const targetCloudFolder = `${PROJECT_NAME}/${CATEGORY_NAME}/${SUBCATEGORY_NAME}/${item.slug}`;
    console.log(`\nProcessing: ${item.slug} -> Cloudinary folder: ${targetCloudFolder}`);

    const files = fs.readdirSync(localDir)
      .filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      });

    uploadedMap[item.slug] = [];

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const filePath = path.join(localDir, fileName);
      const publicId = `${i + 1}`; // 1, 2, 3...
      const uploadRes = await uploadFile(filePath, targetCloudFolder, publicId);

      uploadedMap[item.slug].push({
        id: uploadRes.asset_id || Date.now() + i,
        src: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        name: `${item.slug} image ${i + 1}`,
        alt: `${item.slug} image ${i + 1}`,
      });
      console.log(`  [OK] ${uploadRes.public_id} => ${uploadRes.secure_url}`);
    }
  }

  // 3. Update real-products.json
  console.log('\n--- Updating real-products.json with Cloudinary URLs ---');
  let updatedCount = 0;
  for (const prod of products) {
    if (uploadedMap[prod.slug] && uploadedMap[prod.slug].length > 0) {
      prod.images = uploadedMap[prod.slug].map((img, i) => ({
        id: 300000 + (prod.id % 1000) * 10 + (i + 1),
        src: img.src,
        public_id: img.public_id,
        name: prod.name,
        alt: prod.name,
      }));

      // Update size-chart image reference in description if present
      if (sizeChartCloudUrl && prod.description.includes('/products/tawakkal-wada/size-chart.jpeg')) {
        prod.description = prod.description.replace(
          '/products/tawakkal-wada/size-chart.jpeg',
          sizeChartCloudUrl
        );
      }

      updatedCount++;
      console.log(`Updated product: ${prod.name} (${prod.images.length} images)`);
    }
  }

  fs.writeFileSync(productsJsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} products in real-products.json.`);

  // 4. Update categories thumbnail in real-categories.json
  if (uploadedMap['tawakkal-wada-midnight-black']?.[0]) {
    const midnightHero = uploadedMap['tawakkal-wada-midnight-black'][0].src;
    const emeraldHero = uploadedMap['tawakkal-wada-deep-emerald-green']?.[0]?.src || midnightHero;
    const coffeeHero = uploadedMap['tawakkal-wada-dark-coffee-brown']?.[0]?.src || midnightHero;

    for (const cat of categories) {
      if (cat.slug === 'tawakkal') cat.image = { id: 300001, src: midnightHero, alt: 'Tawakkal' };
      if (cat.slug === '3-piece-suit') cat.image = { id: 300002, src: emeraldHero, alt: '3-Piece Suit' };
      if (cat.slug === 'wada-collection') cat.image = { id: 300003, src: coffeeHero, alt: 'Wada Collection' };
    }
    fs.writeFileSync(categoriesJsonPath, JSON.stringify(categories, null, 2), 'utf8');
    console.log('Updated category banner images with Cloudinary URLs.');
  }

  console.log('\n=== ALL PRODUCTS SUCCESSFULLY UPLOADED TO CLOUDINARY ===');
}

run().catch((err) => {
  console.error('Fatal error during Cloudinary upload:', err);
  process.exit(1);
});
