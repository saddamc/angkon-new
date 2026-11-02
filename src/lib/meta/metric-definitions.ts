/**
 * Centralized Meta Marketing & E-Commerce Metric Definitions
 *
 * Each metric or configuration definition strictly provides:
 * 1. Meaning (What it means)
 * 2. Why it matters (Business impact)
 * 3. Calculation (How it is calculated)
 * 4. Data source (Where the data originates)
 * 5. Limitations (Key constraints or edge cases)
 */

export interface MetricDefinition {
  key: string;
  label: string;
  shortDescription: string;
  meaning: string;
  whyItMatters: string;
  calculation: string;
  dataSource: string;
  limitations: string;
  metaSource?: {
    label: string;
    url?: string;
    steps?: string[];
  };
  documentationUrl?: string;
  badge?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ── KPI & Revenue Metrics ────────────────────────────────────────────────
  "store-revenue": {
    key: "store-revenue",
    label: "Store Total Revenue (Gross)",
    shortDescription: "Verified cash and digital payments collected through your storefront.",
    meaning: "The gross monetary value of all confirmed customer purchases placed on angkon.net, including product sales and shipping fees.",
    whyItMatters: "Represents authentic first-party store income. This is the financial ground truth used to evaluate marketing viability and true business profitability.",
    calculation: "Sum of (order.total) for all orders where orderStatus is completed, processing, or pending. Excludes cancelled, refunded, failed, and trash orders.",
    dataSource: "[Store Ledger] Direct MongoDB 'orders' collection. Independent of ad network claims.",
    limitations: "Does not deduct payment gateway fees (SSLCommerz ~2-3%) or merchant inventory COGS. Reflects gross top-line turnover.",
    documentationUrl: "https://business.facebook.com/help",
    badge: "First-Party Verified",
  },

  "store-net-revenue": {
    key: "store-net-revenue",
    label: "Store Net Revenue",
    shortDescription: "Gross revenue minus cancelled, refunded, or failed checkouts.",
    meaning: "The actual realized revenue after accounting for order cancellations and failed deliveries.",
    whyItMatters: "Provides an accurate baseline for financial planning without distortion from returned or cancelled Cash on Delivery (COD) packages.",
    calculation: "Total Gross Revenue minus (Cancelled + Refunded + Failed Order Totals).",
    dataSource: "[Store Ledger] Filtered MongoDB 'orders' collection with confirmed paymentStatus: 'paid' or completed status.",
    limitations: "Returns processed after delivery (e.g. within a 7-day exchange window) must be manually updated in order records.",
  },

  "meta-ad-spend": {
    key: "meta-ad-spend",
    label: "Meta Marketing Ad Spend",
    shortDescription: "Total advertising capital deployed across Facebook and Instagram campaigns.",
    meaning: "The actual advertising spend billed by Meta for impressions and link clicks delivered across Facebook, Instagram, Audience Network, and Messenger.",
    whyItMatters: "Direct customer acquisition cost. In Bangladesh, Meta Ad accounts are billed in USD ($) while storefront transactions are in BDT (৳).",
    calculation: "Sum of campaign-level daily spend retrieved from Meta Graph API v22.0 Ad Account Insights. Converted to BDT at standard commercial benchmark (~120 BDT/USD) for blended calculations.",
    dataSource: "[Meta Graph API v22.0] Direct report from Ad Account (act_1646756900434912) Insights endpoint.",
    limitations: "Meta spend metrics may lag by 2-4 hours due to Graph API aggregation windows. Spend does not include local card tax / VAT (typically 15% in BD).",
    metaSource: {
      label: "Meta Ads Manager → Campaigns → Amount Spent",
      url: "https://adsmanager.facebook.com",
    },
    badge: "Meta Billed",
  },

  "blended-roas": {
    key: "blended-roas",
    label: "Blended Return on Ad Spend (MER)",
    shortDescription: "First-party Marketing Efficiency Ratio comparing total store cash to total Meta ad spend.",
    meaning: "Measures overall marketing efficiency by dividing total verified store revenue by total deployed Meta ad spend.",
    whyItMatters: "Unlike Meta-reported ROAS (which relies on estimated click/view-through attribution models), Blended ROAS cannot be faked or over-reported. A blended ROAS > 3.0x indicates healthy unit economics.",
    calculation: "Total Store Revenue (BDT) ÷ Meta Ad Spend converted to BDT (USD spend × 120 BDT/USD).",
    dataSource: "[Store Ledger ÷ Meta Graph API] Combined first-party order revenue and third-party advertising spend.",
    limitations: "Blended ROAS treats all sales as part of the total marketing mix; it does not isolate organic or word-of-mouth sales from paid traffic.",
    documentationUrl: "https://www.facebook.com/business/help/1665333080167380",
    badge: "Truth in Advertising",
  },

  "meta-roas": {
    key: "meta-roas",
    label: "Meta-Reported ROAS (Ad Account)",
    shortDescription: "Return on Ad Spend claimed by Meta's attribution model.",
    meaning: "The return on ad spend estimated by Meta based on 7-day click and 1-day view attribution windows.",
    whyItMatters: "Used by Meta's Advantage+ algorithms to automatically bid, allocate budget, and optimize delivery toward high-intent audiences.",
    calculation: "Meta Reported Purchase Conversion Value ÷ Meta Ad Spend.",
    dataSource: "[Meta Ads Manager] Graph API v22.0 purchase_roas action metric.",
    limitations: "Subject to over-attribution due to 1-day view-through claims and privacy-related statistical modeling on iOS 14.5+ devices.",
    metaSource: {
      label: "Meta Ads Manager → Columns: Customize → Purchase ROAS",
      url: "https://adsmanager.facebook.com",
    },
  },

  "aov": {
    key: "aov",
    label: "Average Order Value (AOV)",
    shortDescription: "Average monetary amount spent per confirmed customer order.",
    meaning: "The mean basket size across all successful checkouts on your e-commerce storefront.",
    whyItMatters: "Increasing AOV directly increases ROAS without requiring additional advertising spend or higher traffic volume.",
    calculation: "Total Store Revenue (BDT) ÷ Total Completed Orders.",
    dataSource: "[Store Ledger] MongoDB 'orders' collection.",
    limitations: "Can be skewed by extreme single-order outliers (e.g. bulk purchases or high-end bridal sets).",
  },

  "orders-completed": {
    key: "orders-completed",
    label: "Completed Customer Orders",
    shortDescription: "Count of real, physical purchases fulfilled or in delivery pipeline.",
    meaning: "The count of unique, verified purchase transactions placed by real customers in your store.",
    whyItMatters: "Represents authentic commercial demand. Distinguishes genuine customer purchases from synthetic test signals or duplicate telemetry events.",
    calculation: "Count of documents in MongoDB 'orders' with status 'completed', 'processing', or 'pending'.",
    dataSource: "[Store Ledger] MongoDB 'orders' collection.",
    limitations: "Does not count abandoned checkouts or orders cancelled prior to merchant dispatch.",
    badge: "Verified Orders",
  },

  // ── Telemetry & Event Metrics ──────────────────────────────────────────
  "telemetry-events": {
    key: "telemetry-events",
    label: "Total Telemetry Events",
    shortDescription: "Raw volume of tracking signals captured across Browser Pixel and Conversions API.",
    meaning: "The aggregate count of all behavioural events (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase) received by your telemetry ledger.",
    whyItMatters: "High telemetry volume feeds Meta's AI with user engagement patterns, enabling precise Advantage+ lookalike modeling and dynamic retargeting.",
    calculation: "Sum of all event log records in MongoDB 'metaeventlogs' over the selected date range.",
    dataSource: "[Telemetry Ledger] MongoDB 'metaeventlogs' paired with Meta Events Manager dataset telemetry.",
    limitations: "Telemetry event count reflects raw signals, NOT unique visitors or unique orders. For instance, a single visitor browsing 10 sarees generates 10 ViewContent signals and 1 PageView signal.",
    badge: "Raw Signals",
  },

  "purchase-signal-reconciliation": {
    key: "purchase-signal-reconciliation",
    label: "Purchase Signals vs Verified Store Orders",
    shortDescription: "Explanation of why telemetry purchase signals differ from completed store orders.",
    meaning: "Telemetry purchase signals include browser pixel clicks, CAPI test payloads, diagnostic simulations, and live orders. Store orders strictly represent real customer checkouts in your database.",
    whyItMatters: "Prevents confusing internal QA test dispatches with actual customer cash sales. Crucial for financial transparency.",
    calculation: "Store Orders = count(MongoDB Order). Telemetry Signals = count(MetaEventLog where eventName='Purchase'). Discrepancy = Test/Silenced Events + Browser reloads.",
    dataSource: "[Store Ledger vs Telemetry Ledger] Dual audit comparison.",
    limitations: "Browser-side pixel triggers can fire if an admin refreshes the order confirmation page or conducts manual checkout verification.",
  },

  "event-match-quality": {
    key: "event-match-quality",
    label: "Event Match Quality (EMQ)",
    shortDescription: "Meta rating (0-10) scoring how effectively server events match Meta user profiles.",
    meaning: "A numerical rating assigned by Meta measuring how many customer information parameters (email, phone, fbp, fbc, IP address, user agent) are sent with server events.",
    whyItMatters: "High EMQ (8.0+) ensures Meta can match website actions to real Facebook/Instagram accounts, cutting acquisition cost by up to 30%.",
    calculation: "Weighted score calculated across SHA-256 normalized parameters (Email: 30%, Phone: 25%, FBP/FBC: 20%, Client IP/UA: 15%, Location: 10%).",
    dataSource: "[Meta Conversions API] Calculated from event payloads and verified via Meta Events Manager Diagnostics.",
    limitations: "Browser events without customer sign-in only transmit IP and User Agent; full EMQ of 8+ is typically achieved at AddToCart, Checkout, and Purchase when customer details are entered.",
    metaSource: {
      label: "Meta Events Manager → Overview → Event Match Quality",
      url: "https://eventsmanager.facebook.com",
    },
    badge: "Target: 8.0+",
  },

  "deduplication-rate": {
    key: "deduplication-rate",
    label: "Deduplication Rate",
    shortDescription: "Percentage of events received from both Browser Pixel and CAPI that were successfully deduplicated.",
    meaning: "The proportion of twin signals (Browser Pixel + Server Conversions API) sharing the same event_id and event_name that Meta processed as a single event.",
    whyItMatters: "Prevents double-counting conversions. If deduplication fails, Meta will register 2 purchases for every single customer order, inflating reported ROAS and misallocating ad budgets.",
    calculation: "Deduplicated Events ÷ (Total Paired Browser + Server Events) × 100.",
    dataSource: "[Dual Ledger] Meta Events Manager Overview tab under 'Event Deduplication'.",
    limitations: "Requires exact case-sensitive matching on event_id and event_name within a 48-hour deduplication window.",
    badge: "Target: 100%",
  },

  "attribution-window": {
    key: "attribution-window",
    label: "Attribution Window",
    shortDescription: "Timeframe during which Meta credits an ad for a customer conversion.",
    meaning: "The rule determining which ad gets credit for a sale. Default is 7-day click and 1-day view (SKAdNetwork / Aggregated Event Measurement).",
    whyItMatters: "A 1-day view window may claim credit for customers who would have bought anyway, whereas a 7-day click window requires a direct interaction.",
    calculation: "Configured at Ad Set creation in Meta Ads Manager. Actions occurring beyond the window are not credited to the ad.",
    dataSource: "[Meta Graph API] Ad Set attribution_spec property.",
    limitations: "Since Apple iOS 14.5, view-through attribution is modeled through Aggregated Event Measurement with a 24-48 hour reporting delay.",
  },

  // ── Ad Performance Metrics ──────────────────────────────────────────────
  "ctr": {
    key: "ctr",
    label: "Click-Through Rate (CTR)",
    shortDescription: "Percentage of ad impressions that resulted in a link click.",
    meaning: "Measures creative engagement and audience relevance by dividing link clicks by ad impressions.",
    whyItMatters: "A high CTR (>1.5% for e-commerce fashion) signals compelling saree photography, engaging copywriting, and accurate audience targeting.",
    calculation: "(Outbound Link Clicks ÷ Ad Impressions) × 100.",
    dataSource: "[Meta Graph API v22.0] Ad Account Insights 'inline_link_click_ctr'.",
    limitations: "High CTR does not guarantee sales if the storefront landing page experience or product pricing is misaligned.",
    badge: "Benchmark: > 1.5%",
  },

  "cpc": {
    key: "cpc",
    label: "Cost Per Click (CPC)",
    shortDescription: "Average expense incurred for every visitor directed to your storefront.",
    meaning: "The average cost charged by Meta each time a prospective customer clicks on your ad creative.",
    whyItMatters: "Lower CPC allows your budget to drive higher traffic volume into your product catalog.",
    calculation: "Total Ad Spend ÷ Total Link Clicks.",
    dataSource: "[Meta Graph API v22.0] Ad Account Insights 'cost_per_inline_link_click'.",
    limitations: "A very low CPC on broad audiences can bring low-intent traffic with poor conversion rates. Balance with ROAS.",
  },

  "cpm": {
    key: "cpm",
    label: "Cost Per Mille (CPM)",
    shortDescription: "Cost to display your ad 1,000 times across Facebook and Instagram.",
    meaning: "The foundational auction cost of advertising inventory on Meta's network.",
    whyItMatters: "CPM indicates auction competition. CPM spikes during festive shopping seasons (Eid, Puja, Black Friday).",
    calculation: "(Total Ad Spend ÷ Total Impressions) × 1,000.",
    dataSource: "[Meta Graph API v22.0] Ad Account Insights 'cpm'.",
    limitations: "Auction CPM is determined by Meta's algorithm based on ad quality rank, engagement rate ranking, and audience saturation.",
  },

  // ── Product Intelligence Classifications ────────────────────────────────
  "product-quadrants": {
    key: "product-quadrants",
    label: "Product Performance Classifications",
    shortDescription: "Mathematical categorization of catalog sarees based on traffic and sales conversion.",
    meaning: "Separates catalog inventory into actionable quadrants: Hero Winner, Early Signal / Insufficient Data, High Abandonment, and Testing Phase.",
    whyItMatters: "Prevents spending ad budget on unproven products while ensuring winning sarees receive maximum Advantage+ budget.",
    calculation: "Evaluated using verified orders (minimum 5 orders required for 'Winner'), view-to-cart rate, and checkout drop-off rate.",
    dataSource: "[Store Ledger + Telemetry Matrix] Cross-referenced Product, Order, and MetaEventLog collections.",
    limitations: "Requires active traffic. Newly added catalog products start in 'Testing Phase' until statistical sample size is achieved.",
    badge: "Statistical Sample Required",
  },

  "quadrant-hero-winner": {
    key: "quadrant-hero-winner",
    label: "Hero Winner",
    shortDescription: "Proven revenue generator with high conversion rate and verified sales.",
    meaning: "A top-performing product with statistically significant sales (≥ 5 verified orders) and healthy conversion rate (≥ 2.0%).",
    whyItMatters: "These products provide predictable returns. They should be featured in Meta Advantage+ Dynamic Product Ads and hero banners.",
    calculation: "Verified Orders ≥ 5 AND Conversion Rate ≥ 2.0%.",
    dataSource: "[Store Ledger] Confirmed order history.",
    limitations: "Monitor inventory stock closely. If a Hero Winner goes out of stock, Meta Advantage+ ads will waste spend.",
    badge: "Scale Ad Budget",
  },

  "quadrant-emerging-signal": {
    key: "quadrant-emerging-signal",
    label: "Early Signal / Insufficient Data",
    shortDescription: "Promising product with early sales but insufficient sample size to declare a definitive winner.",
    meaning: "A saree that has generated 1 to 4 sales. While initial demand is positive, sample size is too small to guarantee repeatable performance.",
    whyItMatters: "Protects merchants from over-investing thousands of dollars into a product based on a single accidental or friend-and-family purchase.",
    calculation: "Verified Orders between 1 and 4. Awaiting minimum 5 orders.",
    dataSource: "[Store Ledger + Telemetry] Emerging transaction records.",
    limitations: "Requires additional controlled test budget (e.g. $5–$10/day) to validate repeat purchase behavior.",
    badge: "Awaiting Sample (N < 5)",
  },

  "quadrant-high-abandonment": {
    key: "quadrant-high-abandonment",
    label: "High Cart Abandonment",
    shortDescription: "High shopper browsing and cart additions, but low checkout completion.",
    meaning: "Shoppers frequently view this saree and add it to cart, but drop off before completing the checkout process.",
    whyItMatters: "Highlights friction in pricing, delivery charges, or checkout clarity. Prime candidate for retargeting discount ads or free shipping promotions.",
    calculation: "Cart Adds ≥ 3 AND Checkout Drop-off Rate ≥ 65% with Orders < 2.",
    dataSource: "[Telemetry Ledger] ViewContent vs AddToCart vs Order funnel.",
    limitations: "May indicate competitor price comparison or unclear sizing/material details on the product page.",
    badge: "Optimize Funnel",
  },

  "quadrant-testing-phase": {
    key: "quadrant-testing-phase",
    label: "Testing Phase / Low Traffic",
    shortDescription: "Catalog item with low exposure awaiting visitor traffic.",
    meaning: "Products that have received fewer than 20 views and have 0 completed sales.",
    whyItMatters: "These sarees cannot be accurately assessed until sufficient customer traffic has been delivered.",
    calculation: "Views < 20 AND Orders = 0.",
    dataSource: "[Telemetry Ledger] Low signal count in MetaEventLog.",
    limitations: "Do not judge product appeal until at least 50-100 target shoppers have viewed the item.",
    badge: "Send Traffic",
  },

  // ── Configuration Fields ────────────────────────────────────────────────
  "pixel-id": {
    key: "pixel-id",
    label: "Meta Dataset / Pixel ID",
    shortDescription: "Unique 15-16 digit identifier for your Meta tracking dataset.",
    meaning: "The numerical ID assigned by Meta Business Manager to identify your website's tracking dataset across browser and server telemetry.",
    whyItMatters: "Without a valid Dataset ID, all browser and server signals are dropped by Meta's edge servers.",
    calculation: "Generated by Meta Events Manager when creating a Dataset under Data Sources.",
    dataSource: "[Meta Business Manager] Stored securely in MongoDB 'pixelsettings'.",
    limitations: "Must be a 15-16 digit numeric string. Avoid leading or trailing whitespace.",
    metaSource: {
      label: "Meta Events Manager → Data Sources → Datasets → Settings → Dataset ID",
      url: "https://eventsmanager.facebook.com",
    },
  },

  "capi-token": {
    key: "capi-token",
    label: "Conversions API System User Access Token",
    shortDescription: "Permanent, authenticated API credential for server-to-server event dispatch.",
    meaning: "A 60-day or system-user permanent access token granting ANGKON's backend server permission to push events directly to Meta Graph API.",
    whyItMatters: "Bypasses iOS ad blockers, private relay, and browser cookie restrictions, recovering up to 30% of lost conversion tracking.",
    calculation: "Generated inside Meta Business Manager under System Users with 'ads_management' or Conversions API permissions.",
    dataSource: "[Meta Business Manager] Stored in MongoDB encrypted at rest using AES-256-GCM. Never transmitted in plaintext.",
    limitations: "System user tokens do not expire, but personal user tokens expire after 60 days. Always use a System User token for production.",
    metaSource: {
      label: "Meta Business Manager → System Users → Generate New Token",
      url: "https://business.facebook.com/settings/system-users",
    },
    badge: "AES-256-GCM Encrypted",
  },

  "ad-account-id": {
    key: "ad-account-id",
    label: "Meta Ad Account ID",
    shortDescription: "Prefix 'act_' followed by your Meta Ad Account number.",
    meaning: "The unique account ID that owns your advertising campaigns, budgets, and billing profiles on Meta.",
    whyItMatters: "Required to synchronize campaign spend, ad clicks, impressions, and ROAS directly into ANGKON's Business Intelligence dashboard.",
    calculation: "Found in Meta Ads Manager URL or account dropdown (e.g. act_1646756900434912).",
    dataSource: "[Meta Ads Manager] Stored in MongoDB 'metamarketingsettings'.",
    limitations: "Must start with the 'act_' prefix when communicating with Meta Graph API. Single-account sync per tenant currently supported.",
    metaSource: {
      label: "Meta Ads Manager → Account Dropdown → Ad Account ID",
      url: "https://adsmanager.facebook.com",
    },
  },

  "catalog-id": {
    key: "catalog-id",
    label: "Meta Commerce Catalog ID",
    shortDescription: "Identifier for your product feed in Meta Commerce Manager.",
    meaning: "The numerical identifier of your Commerce Catalog containing all 16 saree products synchronized via ANGKON's RSS 2.0 XML feed.",
    whyItMatters: "Enables Instagram Shopping, Facebook Shop, and Advantage+ Dynamic Product Ads (DPA) featuring accurate pricing, stock, and imagery.",
    calculation: "Generated by Meta Commerce Manager when creating an E-Commerce Product Catalog.",
    dataSource: "[Meta Commerce Manager] Stored in MongoDB 'metacatalogsettings'.",
    limitations: "Products must have high-resolution images (≥ 500x500px), valid pricing, and in-stock inventory.",
    metaSource: {
      label: "Meta Commerce Manager → Catalogs → Settings → Catalog ID",
      url: "https://business.facebook.com/commerce_manager",
    },
  },
};

export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key];
}
