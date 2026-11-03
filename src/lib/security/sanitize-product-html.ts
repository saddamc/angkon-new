import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for product copy rendered as HTML.
 *
 * Product `description` / `short_description` are rich text stored in MongoDB
 * and rendered with `dangerouslySetInnerHTML` on the public product page. They
 * are admin-authored, but also arrive from imports and feeds, so they must be
 * treated as untrusted: a stored `<img onerror>` or `<script>` would otherwise
 * execute for every shopper.
 *
 * The allow-list is deliberately conservative and covers only what the product
 * templates actually render — paragraphs, headings, emphasis, lists, tables,
 * links and images. Everything else (scripts, iframes, event handlers, inline
 * styles, `data:` URLs) is dropped.
 *
 * Runs on the server only, so the browser never receives the unsanitised string.
 */

const ALLOWED_TAGS = [
  // Block structure
  "p",
  "br",
  "hr",
  "div",
  "blockquote",
  "pre",
  "code",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Inline emphasis
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "small",
  "sub",
  "sup",
  "span",
  // Lists
  "ul",
  "ol",
  "li",
  // Tables (size charts)
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  // Media
  "a",
  "img",
  "figure",
  "figcaption",
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    colgroup: ["span"],
    "*": ["class"],
  },
  // No `javascript:`, `vbscript:` or `data:` — only real navigation targets.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // Links that leave the storefront must not be able to reach back into it.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
    }),
  },
  // Drop the contents of these entirely rather than leaving stray text.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
};

/** Returns sanitised HTML, or an empty string for missing input. */
export function sanitizeProductHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

/** Strips all markup — for places that need plain text (e.g. JSON-LD, meta). */
export function stripProductHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
}
