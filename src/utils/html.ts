export const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/** Decode common HTML entities after tag stripping. */
export function decodeEntities(value: string): string {
  if (!value) return "";
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&([a-z]+);/gi, (match, entity: string) => NAMED_ENTITIES[entity.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

export const decodeBasicEntities = decodeEntities;
export const decodeHtmlCharCodes = decodeEntities;


/**
 * Convert HTML into editable plain text
 * (keeps line breaks from <br> / </p>).
 */
export function htmlToPlainText(value: string): string {
  if (!value) return "";
  return decodeBasicEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "div",
]);

function isAllowedAttr(tag: string, attr: string): boolean {
  if (tag === "a" && (attr === "href" || attr === "target" || attr === "rel" || attr === "title")) {
    return true;
  }
  if ((tag === "td" || tag === "th") && (attr === "colspan" || attr === "rowspan")) {
    return true;
  }
  return false;
}

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Clean clipboard / Word / Google Docs HTML into safe markup
 * while keeping visual structure (paragraphs, bold, lists, tables, links).
 */
export function sanitizePastedHtml(raw: string): string {
  if (!raw?.trim()) return "";

  let html = raw
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:o|w|v|m):[^>]*>/gi, "")
    .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "");

  if (typeof document !== "undefined") {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return normalizeEmptyHtml(cleanDomNode(wrapper).innerHTML);
  }

  html = html
    .replace(/\s(style|class|id|lang|dir|width|height|face|size|color|align|valign)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<\/?(?:font|span)(?:\s[^>]*)?>/gi, "");

  return normalizeEmptyHtml(html.trim());
}

function cleanDomNode(root: HTMLElement): HTMLElement {
  const walker = Array.from(root.querySelectorAll("*"));

  for (const el of walker) {
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      if (el.childNodes.length > 0) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      } else {
        el.remove();
      }
      continue;
    }

    const keep: { name: string; value: string }[] = [];
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (!isAllowedAttr(tag, name)) continue;
      if (name === "href") {
        const href = safeHref(attr.value);
        if (!href) continue;
        keep.push({ name: "href", value: href });
        keep.push({ name: "rel", value: "noopener noreferrer" });
        if (href.startsWith("http")) keep.push({ name: "target", value: "_blank" });
        continue;
      }
      keep.push({ name, value: attr.value });
    }
    while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
    for (const { name, value } of keep) el.setAttribute(name, value);

    if (tag === "span" && el.attributes.length === 0) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }

    if (tag === "div") {
      const onlyInline = Array.from(el.children).every((c) =>
        ["span", "strong", "b", "em", "i", "u", "a", "br"].includes(c.tagName.toLowerCase()),
      );
      if (onlyInline || el.children.length === 0) {
        const p = document.createElement("p");
        while (el.firstChild) p.appendChild(el.firstChild);
        el.replaceWith(p);
      }
    }
  }

  root.querySelectorAll("p").forEach((p) => {
    const text = (p.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!text && !p.querySelector("img,br,table,ul,ol")) {
      p.remove();
    }
  });

  return root;
}

function normalizeEmptyHtml(html: string): string {
  const cleaned = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

export function plainTextToHtml(value: string): string {
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\n{2,}/)
    .map((para) => {
      const escaped = para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

export function clipboardToWpHtml(html: string | null | undefined, plain: string | null | undefined): string {
  const rawHtml = (html || "").trim();
  if (rawHtml && /<[a-z][\s\S]*>/i.test(rawHtml)) {
    return sanitizePastedHtml(rawHtml);
  }
  return plainTextToHtml(plain || "");
}

export function toWpDescription(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizePastedHtml(trimmed);
  }

  return plainTextToHtml(trimmed);
}

export function isEmptyHtml(value: string): boolean {
  if (!value?.trim()) return true;
  if (/^(?:<br\s*\/?>|&nbsp;|\s)*$/i.test(value.trim())) return true;
  return !htmlToPlainText(value);
}
