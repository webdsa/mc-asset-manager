"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { itemImageDisplaySrc, itemImageDownloadHref } from "@/lib/item-image";
import { ItemImageLightbox } from "@/app/items/item-image-lightbox";

type ThumbImage = { id: string; url: string; alt: string | null; fileName: string };

export function InventoryItemThumbnail({
  itemId,
  itemName,
  image,
}: {
  itemId: string;
  itemName: string;
  image: ThumbImage | undefined;
}) {
  const [open, setOpen] = useState(false);

  if (!image) {
    return (
      <div className="relative flex h-20 w-24 items-center justify-center overflow-hidden rounded-md bg-slate-100">
        <ImageIcon className="text-slate-400" size={24} />
      </div>
    );
  }

  const viewSrc = itemImageDisplaySrc(itemId, image);

  return (
    <>
      <div className="relative flex h-20 w-24 items-center justify-center overflow-hidden rounded-md bg-slate-100">
        <Image
          src={viewSrc}
          alt={image.alt ?? itemName}
          fill
          sizes="96px"
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
