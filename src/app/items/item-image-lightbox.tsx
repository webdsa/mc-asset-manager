"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";

type ItemImageLightboxProps = {
  open: boolean;
  onClose: () => void;
  /** URL usada na tag <img> (visualização). */
  viewSrc: string;
  alt: string;
  /** URL do link de download (pode incluir `?download=1`). */
  downloadHref: string;
  downloadFileName: string;
};

export function ItemImageLightbox({
  open,
  onClose,
  viewSrc,
  alt,
  downloadHref,
  downloadFileName,
}: ItemImageLightboxProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização da imagem"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 transition hover:bg-black/75"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-[101] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-3 py-2.5 sm:px-4">
          <a
            href={downloadHref}
            download={downloadFileName}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Download size={18} />
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-3 sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica (API / legado) */}
          <img
            src={viewSrc}
            alt={alt}
            className="max-h-[min(78vh,880px)] max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
