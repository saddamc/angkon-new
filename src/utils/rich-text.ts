// Some WooCommerce product descriptions in this store were pasted in as raw
// markdown (from an AI-generated draft) and never converted to real HTML —
// WordPress's autop just wraps each line in <br>, leaving literal
// "| Feature | Details |" pipe syntax and unstructured line-per-line feature
// lists in the output. Detect those specific shapes and turn them into a real
// <table>/<ul> so they render properly instead of a wall of raw text.

function splitBrLines(inner: string): string[] {
  return inner
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isMarkdownTableRow(line: string): boolean {
  return /^\|.*\|$/.test(line);
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|[\s:-]*(\|[\s:-]*)+$/.test(line);
}

function parseMarkdownTableCells(line: string): string[] {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable(lines: string[]): string {
  const [headerLine, , ...bodyLines] = lines;
  const headers = parseMarkdownTableCells(headerLine);
  const rows = bodyLines.filter(isMarkdownTableRow).map(parseMarkdownTableCells);

  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<table>${thead}${tbody}</table>`;
}

function renderFeatureList(lines: string[]): string {
  const [title, ...items] = lines;
  const heading = title.length < 60 ? `<h4>${title}</h4>` : "";
  return `${heading}<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

export function fixPlainTextTablesAndLists(html: string): string {
  if (!html) return html;

  return html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
    const lines = splitBrLines(inner);
    if (lines.length < 2) return match;

    // Markdown table: pipe-delimited header row + a "|---|---|" separator row.
    if (isMarkdownTableRow(lines[0]) && isMarkdownTableSeparator(lines[1])) {
      return renderMarkdownTable(lines);
    }

    // Flat "Title<br>item<br>item..." feature list: a short title line
    // followed by 3+ short lines with no terminal punctuation — real prose
    // paragraphs don't use <br> line breaks this way.
    if (
      lines.length >= 4 &&
      !isMarkdownTableRow(lines[0]) &&
      lines.slice(1).every((line) => line.length < 80 && !/[.!?]$/.test(line))
    ) {
      return renderFeatureList(lines);
    }

    return match;
  });
}
