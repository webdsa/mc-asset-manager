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
  className,
}: {
  itemId: string;
  itemName: string;
  image: ThumbImage | undefined;
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
