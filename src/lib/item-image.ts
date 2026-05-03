/** Prefixo em `ItemImage.url` quando a mídia está no Vercel Blob com acesso privado. */
export const PRIVATE_ITEM_IMAGE_PREFIX = "private:" as const;

export function itemImageDisplaySrc(
  itemId: string,
  image: { id: string; url: string },
): string {
  if (image.url.startsWith(PRIVATE_ITEM_IMAGE_PREFIX)) {
    return `/api/items/${itemId}/images/${image.id}`;
  }
  return image.url;
}

/**
 * URLs sob `/api/items/.../images/...` exigem cookie de sessão. O otimizador de `next/image`
 * corre no servidor sem esse cookie — usar `unoptimized` para o pedido ir ao browser.
 */
export function itemImageNeedsUnoptimizedNextImage(displaySrc: string): boolean {
  return displaySrc.startsWith("/api/");
}

export function privateItemImagePathname(url: string): string | null {
  if (!url.startsWith(PRIVATE_ITEM_IMAGE_PREFIX)) {
    return null;
  }
  return url.slice(PRIVATE_ITEM_IMAGE_PREFIX.length);
}

/** URL para forçar download pelo servidor (Blob privado). Demais casos: use a mesma URL de exibição. */
export function itemImageDownloadHref(itemId: string, image: { id: string; url: string }): string {
  if (image.url.startsWith(PRIVATE_ITEM_IMAGE_PREFIX)) {
    return `/api/items/${itemId}/images/${image.id}?download=1`;
  }
  return image.url;
}
