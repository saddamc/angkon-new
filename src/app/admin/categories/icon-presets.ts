import type { CuratedIcon } from "./types";

/* ─── Luxury Category Banner Presets ─────────────────────────────────── */
export const LUXURY_PRESETS = [
  { name: "Half Sleeves", src: "/banners/half-sleeves.webp" },
  { name: "Full Sleeves", src: "/banners/full-sleeves.webp" },
  { name: "Tees", src: "/banners/tees.webp" },
  { name: "Polo", src: "/banners/polos.webp" },
  { name: "Pants", src: "/banners/pants.webp" },
  { name: "Tops", src: "/banners/tops.webp" },
  { name: "Men Banner", src: "/banners/men-banner.webp" },
  { name: "Women Banner", src: "/banners/women-banner.webp" },
  { name: "Accessories", src: "/banners/accessories.webp" },
  { name: "Ethnic Wear", src: "/banners/ethnic-wear.webp" },
];

/* ─── Curated Category Icons ─────────────────────────────────────────── */
export const CURATED_ICONS: CuratedIcon[] = [
  // Fashion & Apparel
  { label: "Dress", icon: "👗", category: "Fashion", tags: ["gown", "women", "frock", "outfit", "clothing"] },
  { label: "Saree", icon: "🥻", category: "Fashion", tags: ["saree", "sari", "traditional", "ethnic", "women", "indian", "bengali"] },
  { label: "Top / Blouse", icon: "👚", category: "Fashion", tags: ["blouse", "top", "women", "shirt", "clothing"] },
  { label: "T-Shirt", icon: "👕", category: "Fashion", tags: ["tee", "casual", "men", "women", "clothing", "tshirt"] },
  { label: "Shirt & Tie", icon: "👔", category: "Fashion", tags: ["formal", "office", "men", "work", "suit"] },
  { label: "Jacket", icon: "🧥", category: "Fashion", tags: ["coat", "winter", "outerwear", "warm", "blazer"] },
  { label: "Vest / Waistcoat", icon: "🦺", category: "Fashion", tags: ["vest", "waistcoat", "sleeveless"] },
  { label: "Jeans / Pants", icon: "👖", category: "Fashion", tags: ["trousers", "denim", "bottoms", "pants"] },
  { label: "Shorts", icon: "🩳", category: "Fashion", tags: ["boxers", "summer", "beach", "casual"] },
  { label: "Kimono / Robe", icon: "👘", category: "Fashion", tags: ["robe", "traditional", "nightwear", "sleep"] },
  { label: "Swimsuit", icon: "🩱", category: "Fashion", tags: ["monokini", "swimwear", "beach", "pool"] },
  { label: "Bikini", icon: "👙", category: "Fashion", tags: ["beachwear", "swimwear", "summer", "pool"] },
  { label: "Underwear", icon: "🩲", category: "Fashion", tags: ["briefs", "innerwear", "lingerie"] },
  { label: "Socks", icon: "🧦", category: "Fashion", tags: ["stockings", "footwear", "warm", "winter"] },
  { label: "Scarf / Shawl", icon: "🧣", category: "Fashion", tags: ["muffler", "hijab", "winter", "orna", "dupatta"] },
  { label: "Gloves", icon: "🧤", category: "Fashion", tags: ["mittens", "winter", "warm", "hands"] },
  { label: "Cap / Baseball Hat", icon: "🧢", category: "Fashion", tags: ["baseball", "cap", "headwear", "casual"] },
  { label: "Sun Hat", icon: "👒", category: "Fashion", tags: ["straw hat", "summer", "beach", "women"] },
  { label: "Crown", icon: "👑", category: "Fashion", tags: ["royal", "queen", "king", "luxury", "tiara"] },

  // Shoes & Bags
  { label: "Sneakers", icon: "👟", category: "Shoes & Bags", tags: ["shoes", "trainers", "running", "casual", "kicks"] },
  { label: "Formal Shoes", icon: "👞", category: "Shoes & Bags", tags: ["leather", "loafers", "oxford", "office", "men"] },
  { label: "High Heels", icon: "👠", category: "Shoes & Bags", tags: ["pumps", "stilettos", "women", "party", "shoes"] },
  { label: "Flats", icon: "🥿", category: "Shoes & Bags", tags: ["ballet", "loafers", "comfort", "casual", "shoes"] },
  { label: "Sandals", icon: "👡", category: "Shoes & Bags", tags: ["strappy", "open toe", "summer", "shoes"] },
  { label: "Boots", icon: "👢", category: "Shoes & Bags", tags: ["leather boots", "winter", "ankle boots", "shoes"] },
  { label: "Flip Flops", icon: "🩴", category: "Shoes & Bags", tags: ["slippers", "slides", "beach", "summer"] },
  { label: "Handbag", icon: "👜", category: "Shoes & Bags", tags: ["purse", "tote", "leather", "women", "bag"] },
  { label: "Clutch / Purse", icon: "👛", category: "Shoes & Bags", tags: ["coin purse", "wallet", "pouch", "bag"] },
  { label: "Backpack", icon: "🎒", category: "Shoes & Bags", tags: ["school bag", "travel", "rucksack", "bag"] },
  { label: "Suitcase", icon: "🧳", category: "Shoes & Bags", tags: ["luggage", "travel", "trolley", "trip"] },
  { label: "Briefcase", icon: "💼", category: "Shoes & Bags", tags: ["office bag", "laptop bag", "work", "business"] },
  { label: "Shopping Bag", icon: "🛍️", category: "Shoes & Bags", tags: ["retail", "store", "boutique", "shopping"] },
  { label: "Pouch", icon: "👝", category: "Shoes & Bags", tags: ["makeup bag", "accessory bag", "clutch"] },

  // Jewelry & Luxury
  { label: "Ring", icon: "💍", category: "Jewelry", tags: ["engagement", "wedding", "diamond ring", "gold"] },
  { label: "Diamond", icon: "💎", category: "Jewelry", tags: ["gemstone", "crystal", "precious", "luxury"] },
  { label: "Necklace", icon: "📿", category: "Jewelry", tags: ["beads", "pendant", "chain", "jewelry"] },
  { label: "Watch", icon: "⌚", category: "Jewelry", tags: ["timepiece", "luxury watch", "wrist watch"] },
  { label: "Sunglasses", icon: "🕶️", category: "Jewelry", tags: ["shades", "eyewear", "glasses", "summer"] },
  { label: "Eyeglasses", icon: "👓", category: "Jewelry", tags: ["optical", "spectacles", "frames", "vision"] },
  { label: "Gold Coin", icon: "🪙", category: "Jewelry", tags: ["gold", "bullion", "treasure", "currency"] },
  { label: "Mirror", icon: "🪞", category: "Jewelry", tags: ["compact mirror", "beauty", "vanity"] },

  // Beauty & Cosmetics
  { label: "Lipstick", icon: "💄", category: "Beauty", tags: ["makeup", "lips", "cosmetics", "beauty"] },
  { label: "Lotion", icon: "🧴", category: "Beauty", tags: ["skincare", "cream", "moisturizer", "sunscreen", "serum"] },
  { label: "Nail Polish", icon: "💅", category: "Beauty", tags: ["manicure", "nails", "pedicure", "cosmetics"] },
  { label: "Soap", icon: "🧼", category: "Beauty", tags: ["bath", "body wash", "clean", "hygiene"] },
  { label: "Spa / Bubbles", icon: "🫧", category: "Beauty", tags: ["bubbles", "relaxation", "clean", "bath"] },
  { label: "Comb", icon: "🪮", category: "Beauty", tags: ["hair comb", "hair care", "styling", "brush"] },
  { label: "Floral / Perfume", icon: "🌸", category: "Beauty", tags: ["scent", "fragrance", "perfume", "cologne", "flower"] },
  { label: "Herbal / Natural", icon: "🌺", category: "Beauty", tags: ["organic", "botanical", "natural beauty", "flower"] },

  // Sewing, Tailoring & Craft
  { label: "Sewing Thread", icon: "🧵", category: "Sewing & Craft", tags: ["thread", "spool", "stitch", "tailor", "yarn"] },
  { label: "Needle", icon: "🪡", category: "Sewing & Craft", tags: ["sewing needle", "stitch", "tailor", "embroidery"] },
  { label: "Scissors", icon: "✂️", category: "Sewing & Craft", tags: ["cutting", "tailor", "fabric", "craft"] },
  { label: "Yarn", icon: "🧶", category: "Sewing & Craft", tags: ["wool", "knitting", "crochet", "craft"] },
  { label: "Safety Pin", icon: "🧷", category: "Sewing & Craft", tags: ["pin", "fastener", "tailor", "craft"] },
  { label: "Ribbon", icon: "🎀", category: "Sewing & Craft", tags: ["bow", "gift wrap", "decoration", "craft"] },
  { label: "Measuring Tape", icon: "📏", category: "Sewing & Craft", tags: ["ruler", "tailor", "size", "measurement"] },

  // Electronics & Gadgets
  { label: "Smartphone", icon: "📱", category: "Electronics", tags: ["mobile", "phone", "iphone", "android", "cell"] },
  { label: "Laptop", icon: "💻", category: "Electronics", tags: ["computer", "macbook", "pc", "tech"] },
  { label: "Desktop", icon: "🖥️", category: "Electronics", tags: ["monitor", "display", "screen", "pc"] },
  { label: "Headphones", icon: "🎧", category: "Electronics", tags: ["earphones", "audio", "music", "headset"] },
  { label: "Camera", icon: "📷", category: "Electronics", tags: ["dslr", "photo", "photography", "video"] },
  { label: "Gaming Controller", icon: "🎮", category: "Electronics", tags: ["gamepad", "console", "playstation", "xbox", "gaming"] },
  { label: "Battery / Power", icon: "🔋", category: "Electronics", tags: ["powerbank", "cable", "energy"] },
  { label: "Power Plug", icon: "🔌", category: "Electronics", tags: ["adapter", "electric", "charger", "cable"] },
  { label: "Television", icon: "📺", category: "Electronics", tags: ["tv", "smart tv", "display", "screen"] },
  { label: "Microphone", icon: "🎙️", category: "Electronics", tags: ["audio", "mic", "podcast", "recording"] },

  // Home & Living
  { label: "Sofa / Couch", icon: "🛋️", category: "Home & Living", tags: ["couch", "furniture", "living room", "decor"] },
  { label: "Bed", icon: "🛏️", category: "Home & Living", tags: ["bedroom", "mattress", "bedding", "sleep"] },
  { label: "Chair", icon: "🪑", category: "Home & Living", tags: ["furniture", "seat", "dining chair", "desk"] },
  { label: "Plant / Decor", icon: "🪴", category: "Home & Living", tags: ["indoor plant", "flowerpot", "green", "garden"] },
  { label: "Candle", icon: "🕯️", category: "Home & Living", tags: ["aroma", "scented candle", "decor", "fragrance"] },
  { label: "Cooking Pan", icon: "🍳", category: "Home & Living", tags: ["kitchen", "skillet", "cookware", "cooking"] },
  { label: "Dishes / Dinnerware", icon: "🍽️", category: "Home & Living", tags: ["plate", "fork", "knife", "dining", "kitchen"] },
  { label: "Coffee / Mug", icon: "☕", category: "Home & Living", tags: ["tea", "cup", "beverage", "cafe", "espresso"] },
  { label: "Teapot", icon: "🫖", category: "Home & Living", tags: ["kettle", "tea", "pot", "chai"] },
  { label: "Kitchen Knife", icon: "🔪", category: "Home & Living", tags: ["cutlery", "chef", "cooking"] },
  { label: "Laundry Basket", icon: "🧺", category: "Home & Living", tags: ["storage", "organizer", "hamper", "cleaning"] },
  { label: "Broom", icon: "🧹", category: "Home & Living", tags: ["cleaning", "housekeeping", "clean"] },

  // Kids & Toys
  { label: "Baby", icon: "👶", category: "Kids & Toys", tags: ["infant", "newborn", "toddler", "child"] },
  { label: "Teddy Bear", icon: "🧸", category: "Kids & Toys", tags: ["plush", "stuffed animal", "soft toy"] },
  { label: "Baby Bottle", icon: "🍼", category: "Kids & Toys", tags: ["milk", "infant feeding", "nursery"] },
  { label: "Pinata / Party", icon: "🪅", category: "Kids & Toys", tags: ["party", "birthday", "celebration", "toys"] },
  { label: "Kite", icon: "🪁", category: "Kids & Toys", tags: ["flying", "outdoor games", "toys"] },
  { label: "Puzzle", icon: "🧩", category: "Kids & Toys", tags: ["games", "brain games", "educational", "toys"] },
  { label: "Art Palette", icon: "🎨", category: "Kids & Toys", tags: ["drawing", "colors", "painting", "craft"] },
  { label: "Toy Car", icon: "🚗", category: "Kids & Toys", tags: ["automobile", "vehicle", "ride", "racing"] },
  { label: "Scooter", icon: "🛴", category: "Kids & Toys", tags: ["kick scooter", "ride on", "outdoor"] },

  // Sports & Gym
  { label: "Dumbbell / Gym", icon: "🏋️", category: "Sports & Gym", tags: ["weights", "fitness", "workout", "bodybuilding"] },
  { label: "Yoga / Wellness", icon: "🧘", category: "Sports & Gym", tags: ["meditation", "exercise", "wellness", "stretch"] },
  { label: "Bicycle", icon: "🚴", category: "Sports & Gym", tags: ["cycling", "bike", "cardio", "sports"] },
  { label: "Soccer / Football", icon: "⚽", category: "Sports & Gym", tags: ["ball", "sports", "football"] },
  { label: "Basketball", icon: "🏀", category: "Sports & Gym", tags: ["hoops", "ball", "sports"] },
  { label: "Tennis", icon: "🎾", category: "Sports & Gym", tags: ["racket", "ball", "court", "sports"] },
  { label: "Badminton", icon: "🏸", category: "Sports & Gym", tags: ["shuttlecock", "racket", "sports"] },
  { label: "Boxing Gloves", icon: "🥊", category: "Sports & Gym", tags: ["fight", "gloves", "mma", "fitness"] },
  { label: "Tent / Camping", icon: "⛺", category: "Sports & Gym", tags: ["hiking", "outdoor", "camping", "adventure"] },

  // Grocery & Food
  { label: "Shopping Cart", icon: "🛒", category: "Grocery & Food", tags: ["cart", "supermarket", "store", "buy"] },
  { label: "Apple / Fruits", icon: "🍎", category: "Grocery & Food", tags: ["fruit", "fresh", "organic", "healthy"] },
  { label: "Vegetables", icon: "🥦", category: "Grocery & Food", tags: ["broccoli", "greens", "organic", "produce"] },
  { label: "Bakery / Bread", icon: "🍞", category: "Grocery & Food", tags: ["toast", "loaf", "bakery", "breakfast"] },
  { label: "Cake", icon: "🎂", category: "Grocery & Food", tags: ["birthday", "pastry", "dessert", "sweet"] },
  { label: "Chocolates", icon: "🍫", category: "Grocery & Food", tags: ["candy", "sweets", "treats", "cacao"] },
  { label: "Drinks / Juice", icon: "🥤", category: "Grocery & Food", tags: ["soda", "beverage", "cup", "refreshment"] },
  { label: "Honey", icon: "🍯", category: "Grocery & Food", tags: ["organic honey", "sweet", "natural"] },

  // Deals & Badges
  { label: "Price Tag", icon: "🏷️", category: "Deals & Badges", tags: ["discount", "sale", "offer", "deal", "promo"] },
  { label: "Hot / Trending", icon: "🔥", category: "Deals & Badges", tags: ["fire", "viral", "popular", "trending"] },
  { label: "New Arrival", icon: "✨", category: "Deals & Badges", tags: ["sparkles", "fresh", "latest", "new"] },
  { label: "Gift Box", icon: "🎁", category: "Deals & Badges", tags: ["present", "bundle", "special", "reward"] },
  { label: "Best Rated", icon: "⭐", category: "Deals & Badges", tags: ["star", "top", "reviews", "favorite"] },
  { label: "Top Quality", icon: "💯", category: "Deals & Badges", tags: ["100", "perfect", "guarantee", "quality"] },
  { label: "Favorites", icon: "❤️", category: "Deals & Badges", tags: ["heart", "wishlist", "love", "popular"] },
  { label: "Flash Sale", icon: "⚡", category: "Deals & Badges", tags: ["lightning", "fast", "urgent", "deals"] },
  { label: "Package", icon: "📦", category: "Deals & Badges", tags: ["parcel", "shipping", "delivery", "box"] },
  { label: "Delivery", icon: "🚚", category: "Deals & Badges", tags: ["truck", "shipping", "fast delivery", "courier"] },
  { label: "Credit Card", icon: "💳", category: "Deals & Badges", tags: ["payment", "checkout", "bank", "card"] },
  { label: "Best Seller Trophy", icon: "🏆", category: "Deals & Badges", tags: ["award", "trophy", "winner", "top seller"] },
  { label: "Eco Friendly", icon: "🌿", category: "Deals & Badges", tags: ["green", "organic", "leaf", "natural", "sustainable"] },
];

export function isIconUrl(val?: string | null): boolean {
  if (!val) return false;
  return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
}

/**
 * Shrink big photos in the browser before uploading.
 */
export async function convertImageToWebP(
  file: File,
  maxDimension = 1600,
  quality = 0.90
): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let imageSource: ImageBitmap | HTMLImageElement;

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      imageSource = bitmap;
    } else {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      imageSource = img;
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.round(sourceWidth * scale);
    const targetHeight = Math.round(sourceHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if ("close" in imageSource && typeof imageSource.close === "function") {
        imageSource.close();
      }
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    if ("close" in imageSource && typeof imageSource.close === "function") {
      imageSource.close();
    }

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "category";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    console.warn("Client WebP conversion failed, falling back to original file:", err);
    return file;
  }
}
