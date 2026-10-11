# Brand Guidelines & Rebrand Specification: ANGKON

Brand architecture, trademark checks, visual identity, logo brief, voice guidelines, and clean sweep verification.

---

## 1. Brand Identity & Name

- **Brand Name**: **ANGKON**
- **Tagline**: **House of Modern Heritage**
- **Etymology / Metaphor**: "Angkon" (অঙ্কন) evokes fine drawing, artisanal intention, and intentional design — pairing ancient Bengali textile craftsmanship with modern tailored silhouettes.

### Trademark & Digital Presence Screening:
| Check | Channel / Location | Result / Handle | Status |
| :--- | :--- | :--- | :--- |
| **Facebook** | Facebook Page | `facebook.com/share/19LUKov4Ei/` | Verified Active |
| **Instagram** | Instagram Profile | `@angkon.officiall` | Verified Active |
| **TikTok** | TikTok Channel | `@angkon.official` | Verified Active |
| **WhatsApp** | Official Concierge | `+880 1338-668899` | Verified Active |
| **Email** | Direct Contact | `angkonofficial08@gmail.com` | Verified Active |
| **Showroom** | Flagship Boutique | `HOUSE OF MODERN HERITAGE — H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212` | Verified Physical Location |

---

## 2. Visual Palette & Contrast

| Role | Token Value | Usage | WCAG Ratio |
| :--- | :--- | :--- | :--- |
| **Background (`bg`)** | `#400604` | Deep Royal Maroon full canvas | Baseline |
| **Text & Accent (`accent`)** | `#E1B76F` | Warm Heritage Gold typography & buttons | **8.99:1 (AAA)** |
| **Surface Card (`surface`)** | `#4a0705` | Elevated product card surfaces | **8.46:1 (AAA)** |
| **Deep Surface (`surface-deep`)** | `#2b0403` | Header announcement ticker & footer | **8.99:1 (AAA)** |
| **Border (`border`)** | `#5c0f0d` | Subtle luxury container divisions | UI Pass |
| **Muted Text (`text-muted`)** | `#cbb18a` | Secondary descriptions & badges | **8.18:1 (AAA)** |
| **Hover Accent (`accent-hover`)** | `#f3cb87` | Interactive hover glow | High Contrast |

---

## 3. Logo Brief

- **Concept**: Elegant modern typographic wordmark featuring bold geometric serif/sans letterforms with an accent gold period: `ANGKON.`
- **Sub-mark**: Horizontal tracking subtitle: `HOUSE OF MODERN HERITAGE`.
- **Favicon & Monogram**: Stylized monogram letter **`A`** inside royal maroon circular seal with gold rim.
- **Specifications**: Scalable SVG vector, high-resolution PNG (1024x1024), dark background native presentation.

---

## 4. Brand Voice & Tone

### Three Tone Pillars:
1. **Refined, not pretentious**: Elevated language that honors quality without alienating patrons.
2. **Artisanal, not antique**: Modern heritage focused on contemporary everyday wear, not costume.
3. **Direct, not abrupt**: Clear, honest product descriptions with exact measurements.

### 5 Dos and Don'ts:
- **DO** emphasize fabric composition (e.g., "100% Breathable Combed Cotton").
- **DON'T** use cheap fast-fashion hype words (e.g., "Insane drops", "Crazy steals").
- **DO** invite guests to the Niketan showroom to feel the fabrics in person.
- **DON'T** obscure sizing; provide clear measurement tables.
- **DO** treat Cash on Delivery as an honorable convenience, not a risk.

### Rewritten Core Storefront Strings:
1. **Top Announcement**: `⚡ FREE SHIPPING OVER ৳3,000 ● CASH ON DELIVERY ALL OVER BANGLADESH ● EASY 7-DAY EXCHANGE`
2. **Hero Headline**: `Modern Heritage Reimagined`
3. **Primary CTA**: `Shop Collection`
4. **Product Add to Bag**: `Add to Bag`
5. **Direct Purchase**: `Buy It Now`
6. **Free Shipping Progress**: `Add ৳{remaining} more to enjoy complimentary delivery.`
7. **Free Shipping Unlocked**: `🎉 You have unlocked complimentary doorstep delivery.`
8. **Cart Empty**: `Your shopping bag is currently empty. Explore our latest arrivals.`
9. **Order Success**: `Thank you. Your order has been placed successfully.`
10. **Showroom Notice**: `Experience our collection in person at Niketan, Gulshan, Dhaka.`

---

## 5. Rebrand Sweep Results

```bash
python sweep.py . --config replica/brand.json
```
- **Output**: `Clean. Nothing of the original's name, domain or colours found.`
- **Exit Code**: `0` (Success).
