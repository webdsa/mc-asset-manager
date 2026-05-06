"use client";

import { useState } from "react";
import Image from "next/image";
import {
  itemImageDisplaySrc,
  itemImageNeedsUnoptimizedNextImage,
} from "@/lib/item-image";
import { ItemImageRemoveButton } from "@/app/items/item-image-remove-button";
import { ItemImageLightbox } from "@/app/items/item-image-lightbox";

export type EditItemImageRow = {
  id: string;
  url: string;
  alt: string | null;
  fileName: string;
};

export function EditItemImagesPanel({
  itemId,
  itemName,
  images,
}: {
  itemId: string;
  itemName: string;
  images: EditItemImageRow[];
}) {
  const [openFor, setOpenFor] = useState<EditItemImageRow | null>(null);

  return (
    <>
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-slate-600">Fotos atuais</p>
        <ul className="grid grid-cols-2 gap-2">
          {images.map((img) => {
            const viewSrc = itemImageDisplaySrc(itemId, img);
            return (
              <li
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100"
              >
                <Image
                  src={viewSrc}
                  alt={img.alt ?? itemName}
                  fill
                  sizes="(max-width: 1024px) 45vw, 200px"
                  unoptimized={itemImageNeedsUnoptimizedNextImage(viewSrc)}
                  className="object-cover"
                />
                <button
                  type="button"
                  className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                  aria-label={`Ampliar foto: ${img.fileName}`}
                  onClick={() => setOpenFor(img)}
                />
                <ItemImageRemoveButton itemId={itemId} imageId={img.id} />
              </li>
            );
          })}
        </ul>
      </div>

      {openFor ? (
        <ItemImageLightbox
          open
          onClose={() => setOpenFor(null)}
          itemId={itemId}
          itemName={itemName}
          images={images}
          initialIndex={Math.max(0, images.findIndex((img) => img.id === openFor.id))}
        />
      ) : null}
    </>
  );
}
