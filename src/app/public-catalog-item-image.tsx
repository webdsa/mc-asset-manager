"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, X } from "lucide-react";
import { itemImageDisplaySrc, itemImageNeedsUnoptimizedNextImage } from "@/lib/item-image";

export type PublicCatalogImageRow = {
  id: string;
  url: string;
  alt: string | null;
  fileName: string;
};

type PublicCatalogItemImageProps = {
  itemId: string;
  itemName: string;
  images: PublicCatalogImageRow[];
  variant: "grid" | "list";
};

export function PublicCatalogItemImage({
  itemId,
  itemName,
  images,
  variant,
}: PublicCatalogItemImageProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const primary = images[0];
  const viewSrc = primary ? itemImageDisplaySrc(itemId, primary) : null;

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const openModal = useCallback(() => {
    if (images.length === 0) {
      return;
    }
    setIndex(0);
    setOpen(true);
  }, [images.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, goPrev, goNext]);

  const boxClass =
    variant === "grid"
      ? "relative aspect-[4/3] w-full bg-slate-100"
      : "relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 max-lg:row-span-2 lg:h-20 lg:w-24";

  const sizes =
    variant === "grid"
      ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      : "(max-width: 1023px) 108px, 96px";

  const iconSize = variant === "grid" ? 36 : 28;

  const current = images[index];
  const currentSrc = current ? itemImageDisplaySrc(itemId, current) : "";
  const multiview = images.length > 1;

  return (
    <>
      <div className={boxClass}>
        {viewSrc ? (
          <>
            <Image
              src={viewSrc}
              alt={primary?.alt ?? itemName}
              fill
              sizes={sizes}
              unoptimized={itemImageNeedsUnoptimizedNextImage(viewSrc)}
              className="object-cover"
            />
            <button
              type="button"
              className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
              aria-label={`Ver fotos do item ${itemName}`}
              onClick={openModal}
            />
            {multiview ? (
              <span
                className="pointer-events-none absolute right-1.5 top-1.5 z-[2] inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-petroleum-950/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-1 ring-white/15 backdrop-blur-[2px]"
                aria-hidden
              >
                {images.length}
              </span>
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Boxes size={iconSize} />
          </div>
        )}
      </div>

      {open && current ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos do item ${itemName}`}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-[101] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex shrink-0 items-center justify-end gap-3 border-b border-slate-800 px-3 py-2.5 sm:px-4">
              {multiview ? (
                <span className="mr-auto text-sm tabular-nums text-slate-400">
                  {index + 1} / {images.length}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                src={currentSrc}
                alt={current.alt ?? itemName}
                className="max-h-[min(78vh,880px)] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
