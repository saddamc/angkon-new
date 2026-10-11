# Test Plan: ANGKON (Gorur Ghash 100% Replication)

Date: 2026-10-09  
Environment: Local Next.js 16.2 Turbopack  
Theme: Royal Maroon (`#400604`) & Heritage Gold (`#E1B76F`)

---

## Flow Test Matrix

| Case ID | Flow / Feature | Type | Steps | Expected Result | Automated | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-H1** | Homepage Brand & Ticker | Happy | Visit `/`, check top announcement bar & 4 trust pillars | Ticker with ৳3,000 promo visible, trust pillars rendered in `#2b0403` | Yes (`e2e`) | **PASS** |
| **F01-H2** | Apparel Card Image Hover Flip | Happy | Hover over product card on `/products` | Smooth transition from primary to secondary lifestyle photo | Manual | **PASS** |
| **F01-H3** | Size Selection & Add to Cart | Happy | Open `/products/[slug]`, select size `M`, click "Add to Bag" | 460px Astra-style drawer slides out from right with item added | Yes (`e2e`) | **PASS** |
| **F01-E1** | Out of Stock Size Pill | Edge | View item with `stock_quantity = 0` | Size pill shows strikethrough, disabled cursor, "Sold Out" badge | Manual | **PASS** |
| **F01-E2** | Mobile Viewport (390px) | Edge | Resize viewport to 390x844px, open mobile menu | Drawer slides in from left with showroom address and WhatsApp | Yes (`e2e`) | **PASS** |
| **F02-H1** | Quick Buy ("Buy It Now") | Happy | Click solid gold "Buy It Now" on product detail page | Direct redirection to `/checkout` with single item in order | Manual | **PASS** |
| **F03-H1** | Free Shipping Goal (< ৳3,000) | Happy | Add item worth ৳1,200 to cart | Bar shows 40% fill with text: "Add ৳1,800 more for FREE Delivery!" | Yes (`e2e`) | **PASS** |
| **F03-H2** | Free Shipping Unlocked (>= ৳3,000) | Happy | Add items with total >= ৳3,000 | Bar shows 100% gold glow: "🎉 You unlocked FREE Delivery!" | Yes (`e2e`) | **PASS** |
| **F04-H1** | Inside Dhaka Delivery (৳60) | Happy | Select "Dhaka" in district dropdown on checkout | Shipping updates to ৳60, Total = Subtotal + ৳60 | Yes (`e2e`) | **PASS** |
| **F04-H2** | Outside Dhaka Delivery (৳100) | Happy | Select "Chittagong" or "Sylhet" in district dropdown | Shipping updates to ৳100, Total = Subtotal + ৳100 | Yes (`e2e`) | **PASS** |
| **F04-N1** | Missing Phone Validation | Negative | Attempt submitting checkout without phone | Validation alert appears, form blocks submission | Manual | **PASS** |
| **A11Y-01** | WCAG Contrast Verification | A11y | Run `contrast.py` on `tokens.json` | 8/8 pairs pass, 0 failing AA (7 AAA, 1 AA) | Script | **PASS** |
