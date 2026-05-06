export const PUBLIC_CATALOG_PAGE_SIZES = [10, 20, 50, 100] as const;

export type PublicCatalogPageSizeOption = (typeof PUBLIC_CATALOG_PAGE_SIZES)[number];

export const DEFAULT_PUBLIC_CATALOG_PAGE_SIZE: PublicCatalogPageSizeOption = 20;

export function parsePublicCatalogPageSizeParam(raw: string | undefined): PublicCatalogPageSizeOption {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return DEFAULT_PUBLIC_CATALOG_PAGE_SIZE;
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) {
    return DEFAULT_PUBLIC_CATALOG_PAGE_SIZE;
  }
  if ((PUBLIC_CATALOG_PAGE_SIZES as readonly number[]).includes(n)) {
    return n as PublicCatalogPageSizeOption;
  }
  return DEFAULT_PUBLIC_CATALOG_PAGE_SIZE;
}
