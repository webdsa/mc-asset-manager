"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { itemImageDisplaySrc } from "@/lib/item-image";

export type ItemImageLightboxImage = {
  id: string;
  url: string;
  alt: string | null;
  fileName: string;
};

type ItemImageLightboxProps = {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  images: ItemImageLightboxImage[];
  /** Índice da foto exibida ao abrir (default 0). */
  initialIndex?: number;
};

export function ItemImageLightbox({
  open,
  onClose,
  itemId,
  itemName,
  images,
  initialIndex = 0,
}: ItemImageLightboxProps) {
  const [index, setIndex] = useState(0);
  const multiview = images.length > 1;

  useEffect(() => {
    if (!open || images.length === 0) {
      return;
    }
    const i = Math.min(Math.max(0, initialIndex), images.length - 1);
    setIndex(i);
  }, [open, initialIndex, images.length]);

  const current = images[index];
  const viewSrc = current ? itemImageDisplaySrc(itemId, current) : "";
  const alt = current ? current.alt ?? itemName : itemName;

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && multiview) {
        goPrev();
      } else if (e.key === "ArrowRight" && multiview) {
        goNext();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose, multiview, goPrev, goNext]);

  if (!open || !current) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização das imagens do item"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-[101] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            {multiview ? (
              <span className="text-sm tabular-nums text-slate-400">
                {index + 1} / {images.length}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-3 sm:p-6">
          {multiview ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-[102] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-slate-900/90 text-white shadow-lg backdrop-blur transition hover:bg-slate-800 sm:left-4"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-[102] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-slate-900/90 text-white shadow-lg backdrop-blur transition hover:bg-slate-800 sm:right-4"
                aria-label="Próxima foto"
              >
                <ChevronRight size={22} />
              </button>
            </>
          ) : null}
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
