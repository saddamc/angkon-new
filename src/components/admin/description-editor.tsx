"use client";

import { useEffect, useRef, useState } from "react";
import { clipboardToWpHtml, isEmptyHtml, sanitizePastedHtml } from "@/utils/html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** min height in px */
  minHeight?: number;
  className?: string;
};

/**
 * Paste-friendly description editor.
 * Copy from Word / Google Docs / web → keeps paragraphs, bold, lists, tables.
 * Shows the same formatted preview that customers will see.
 */
export function DescriptionEditor({
  value,
  onChange,
  placeholder = "Paste or type product description…",
  minHeight = 88,
  className = "",
}: Props) {
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

  const emit = (html: string, sanitize: boolean) => {
    const cleaned = sanitize ? sanitizePastedHtml(html) : html;
    const next = isEmptyHtml(cleaned) ? "" : cleaned;
    lastEmitted.current = next;
    setEmpty(!next);
    onChange(next);
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    emit(el.innerHTML, false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    const cleaned = clipboardToWpHtml(html, plain);
    if (!cleaned) return;

    const ok = document.execCommand("insertHTML", false, cleaned);
    if (!ok) {
      const el = editorRef.current;
      if (el) {
        el.innerHTML = cleaned;
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

  return (
    <div className={`relative ${className}`}>
      {empty && (
        <div
          className="pointer-events-none absolute left-4 top-2.5 text-[13px] text-stone-400 select-none"
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
        className="product-prose w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#E1B76F]/20 transition overflow-y-auto"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
