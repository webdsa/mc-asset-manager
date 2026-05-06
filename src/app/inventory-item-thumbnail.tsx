"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  itemImageDisplaySrc,
  itemImageNeedsUnoptimizedNextImage,
} from "@/lib/item-image";
import { ItemImageLightbox } from "@/app/items/item-image-lightbox";

type ThumbImage = { id: string; url: string; alt: string | null; fileName: string };

export function InventoryItemThumbnail({
  itemId,
  itemName,
  images,
  className,
  layout = "compact",
}: {
  itemId: string;
  itemName: string;
  images: ThumbImage[];
  className?: string;
  /** `cover`: largura total, proporção fixa (cards em grade no inventário). */
  layout?: "compact" | "cover";
}) {
  const [open, setOpen] = useState(false);
  const image = images[0];
  const imageCount = images.length;

  const boxClass = [
    layout === "cover"
      ? "relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100"
      : "relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!image) {
    return (
      <div className={boxClass}>
        <ImageIcon className="text-slate-400" size={24} />
      </div>
    );
  }

  const viewSrc = itemImageDisplaySrc(itemId, image);

  return (
    <>
      <div className={boxClass}>
        <Image
          src={viewSrc}
          alt={image.alt ?? itemName}
          fill
          sizes={
            layout === "cover"
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              : "(max-width: 1023px) 108px, 96px"
          }
          unoptimized={itemImageNeedsUnoptimizedNextImage(viewSrc)}
          className="object-cover"
        />
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
          aria-label={`Ampliar foto do item ${itemName}`}
          onClick={() => setOpen(true)}
        />
        {imageCount !== undefined && imageCount > 1 ? (
          <span
            className={
              layout === "cover"
                ? "pointer-events-none absolute right-2 top-2 z-[2] inline-flex min-h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full bg-petroleum-950/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-white shadow-md ring-1 ring-white/20 backdrop-blur-[2px]"
                : "pointer-events-none absolute right-1.5 top-1.5 z-[2] inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-petroleum-950/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-1 ring-white/15 backdrop-blur-[2px]"
            }
            aria-label={`${imageCount} imagens`}
          >
            {imageCount}
          </span>
        ) : null}
      </div>

      {open && images.length > 0 ? (
        <ItemImageLightbox
          open
          onClose={() => setOpen(false)}
          itemId={itemId}
          itemName={itemName}
          images={images}
          initialIndex={0}
        />
      ) : null}
    </>
  );
}
