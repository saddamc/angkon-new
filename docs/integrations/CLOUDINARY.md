# Cloudinary Media Integration Guide — ANGKON

## 1. Overview
ANGKON uses **Cloudinary** for image and media asset management, including:
* Luxury product catalog photography (high-resolution zoom views).
* Category banners and marketing graphics.
* Automatic WebP/AVIF format optimization and responsive srcset delivery.

---

## 2. Environment Configuration

```bash
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

---

## 3. Upload & Image Optimization Policies

1. **Upload Pipeline (`src/app/api/admin/upload/route.ts`):**
   * Authenticated admins only (`requireAdminSessionCore`).
   * Supported formats: JPEG, PNG, WebP.
   * Maximum file size: 10MB per image.
   * Auto-tagging by category and product slug.

2. **Delivery Transformations:**
   * Dynamic quality optimization: `q_auto:best`.
   * Responsive width generation: `w_auto,c_limit`.
   * Security watermarks and brand preservation for proprietary apparel designs.
