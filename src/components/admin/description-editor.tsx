"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Code,
  Eye,
  Eraser,
  Copy,
  Check,
  FileText,
  ClipboardPaste,
} from "lucide-react";
import {
  clipboardToWpHtml,
  isEmptyHtml,
  sanitizePastedHtml,
  plainTextToHtml,
} from "@/utils/html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** min height in px */
  minHeight?: number;
  className?: string;
};

/**
 * Industry-level paste-friendly description editor.
 * Features:
 *  - Visual (WYSIWYG) mode with formatting toolbar (Bold, Italic, Headings, Lists, Clear format).
 *  - HTML Code (<>) mode for direct paste/editing of supplier raw HTML or clean text.
 *  - Safe paste insertion at cursor position via modern DOM Selection/Range (never wipes content).
 *  - Toggle for "Paste as Plain Text" to bypass rich formatting when desired.
 *  - 1-click "Copy All" and "Clean Format" utilities.
 */
export function DescriptionEditor({
  value,
  onChange,
  placeholder = "Paste or type product description…",
  minHeight = 120,
  className = "",
}: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [pasteAsPlain, setPasteAsPlain] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const [empty, setEmpty] = useState(() => isEmptyHtml(value));

  // Sync external value (product load) and seed initial HTML once
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (lastEmitted.current !== null && value === lastEmitted.current) return;
    if (el.innerHTML === (value || "")) {
      lastEmitted.current = value;
      setEmpty(isEmptyHtml(value));
      return;
    }
    el.innerHTML = value || "";
    lastEmitted.current = value;
    setEmpty(isEmptyHtml(value));
  }, [value]);

  const emit = useCallback(
    (html: string, sanitize = false) => {
      const cleaned = sanitize ? sanitizePastedHtml(html) : html;
      const next = isEmptyHtml(cleaned) ? "" : cleaned;
      lastEmitted.current = next;
      setEmpty(!next);
      onChange(next);
    },
    [onChange]
  );

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    emit(el.innerHTML, false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    const cleaned = pasteAsPlain
      ? plainTextToHtml(plain)
      : clipboardToWpHtml(html, plain);

    if (!cleaned) return;

    // Use modern Selection / Range API to insert precisely at current cursor position
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const temp = document.createElement("div");
      temp.innerHTML = cleaned;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null;
      let lastNode: ChildNode | null = null;
      while ((node = temp.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      // If editor isn't focused, append safely
      if (editorRef.current) {
        editorRef.current.innerHTML = (editorRef.current.innerHTML || "") + cleaned;
      }
    }
    handleInput();
  };

  const handleBlur = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = sanitizePastedHtml(el.innerHTML);
    const next = isEmptyHtml(cleaned) ? "" : cleaned;
    if (el.innerHTML !== next) el.innerHTML = next;
    emit(next, false);
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (mode !== "visual") return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleCleanFormat = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = sanitizePastedHtml(el.innerHTML);
    el.innerHTML = cleaned;
    emit(cleaned, false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`rounded-xl border border-purple-100/60 bg-white overflow-hidden shadow-xs focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition ${className}`}>
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-100/60 bg-gray-50/70 text-gray-600 flex-wrap gap-1">
        {/* Formatting Actions (Visible in Visual Mode) */}
        {mode === "visual" ? (
          <div className="flex items-center gap-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => execCmd("bold")}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("italic")}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition italic"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("underline")}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition underline"
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>

            <span className="w-px h-4 bg-stone-300 mx-1" />

            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<h2>")}
              className="px-2 py-1 rounded hover:bg-stone-200/80 text-[11px] font-bold text-stone-700 transition"
              title="Heading 2"
            >
              <span className="flex items-center gap-0.5">
                <Heading2 className="h-3 w-3" /> H2
              </span>
            </button>
            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<h3>")}
              className="px-2 py-1 rounded hover:bg-stone-200/80 text-[11px] font-bold text-stone-700 transition"
              title="Heading 3"
            >
              <span className="flex items-center gap-0.5">
                <Heading3 className="h-3 w-3" /> H3
              </span>
            </button>
            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<p>")}
              className="px-1.5 py-1 rounded hover:bg-stone-200/80 text-[11px] font-medium text-stone-600 transition"
              title="Paragraph"
            >
              P
            </button>

            <span className="w-px h-4 bg-stone-300 mx-1" />

            <button
              type="button"
              onClick={() => execCmd("insertUnorderedList")}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("insertOrderedList")}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 transition"
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>

            <span className="w-px h-4 bg-stone-300 mx-1" />

            <button
              type="button"
              onClick={handleCleanFormat}
              className="p-1.5 rounded hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition"
              title="Clean formatting (remove messy inline styles)"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPasteAsPlain(!pasteAsPlain)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                pasteAsPlain
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-stone-500 hover:bg-stone-200/80"
              }`}
              title="When enabled, pasted text is converted into clean plain paragraphs"
            >
              <ClipboardPaste className="h-3 w-3" />
              {pasteAsPlain ? "Plain Paste ON" : "Plain Paste"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
            <Code className="h-3.5 w-3.5 text-purple-600" />
            <span>Raw HTML / Code Mode — paste supplier tags or edit markup directly</span>
          </div>
        )}

        {/* View Mode Toggle + Copy */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition cursor-pointer"
            title="Copy content to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <div className="flex bg-stone-200/70 p-0.5 rounded-lg text-[10.5px] font-bold">
            <button
              type="button"
              onClick={() => setMode("visual")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                mode === "visual"
                  ? "bg-white text-purple-700 shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Eye className="h-3 w-3" /> Visual
            </button>
            <button
              type="button"
              onClick={() => setMode("html")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                mode === "html"
                  ? "bg-white text-purple-700 shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Code className="h-3 w-3" /> HTML
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      {mode === "visual" ? (
        <div className="relative">
          {empty && (
            <div
              className="pointer-events-none absolute left-4 top-3 text-[13px] text-stone-400 select-none"
              aria-hidden
            >
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            onBlur={handleBlur}
            className="admin-prose w-full p-4 text-[13px] text-stone-900 focus:outline-none transition overflow-y-auto leading-relaxed bg-white"
            style={{ minHeight, color: "#1c1917", caretColor: "#9333ea" }}
            data-placeholder={placeholder}
          />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            lastEmitted.current = next;
            setEmpty(isEmptyHtml(next));
            onChange(next);
          }}
          placeholder="Type or paste HTML markup here (e.g. <p>Description...</p>)..."
          className="w-full p-4 text-[12px] font-mono text-stone-800 bg-stone-50/40 focus:bg-white focus:outline-none resize-y"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
