"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  itemImageDisplaySrc,
  itemImageDownloadHref,
  itemImageNeedsUnoptimizedNextImage,
} from "@/lib/item-image";
import { ItemImageLightbox } from "@/app/items/item-image-lightbox";

type ThumbImage = { id: string; url: string; alt: string | null; fileName: string };

export function InventoryItemThumbnail({
  itemId,
  itemName,
  image,
  imageCount,
  className,
}: {
  itemId: string;
  itemName: string;
  image: ThumbImage | undefined;
  /** Total de fotos do item; badge só aparece com mais de uma foto */
  imageCount?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const boxClass = [
    "relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100",
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
          sizes="(max-width: 1023px) 108px, 96px"
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
            className="pointer-events-none absolute right-1.5 top-1.5 z-[2] inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-petroleum-950/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm ring-1 ring-white/15 backdrop-blur-[2px]"
            aria-hidden
          >
            {imageCount}
          </span>
        ) : null}
      </div>

      {open ? (
        <ItemImageLightbox
          open
          onClose={() => setOpen(false)}
          viewSrc={viewSrc}
          alt={image.alt ?? itemName}
          downloadHref={itemImageDownloadHref(itemId, image)}
          downloadFileName={image.fileName}
        />
      ) : null}
    </>
  );
}
