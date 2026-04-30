/** Link para baixar/visualizar a nota fiscal sempre pela aplicação (API faz streaming seguro). */
export function itemInvoiceDownloadHref(item: {
  id: string;
  invoiceFileUrl?: string | null;
}): string | null {
  if (item.invoiceFileUrl) {
    return `/api/items/${item.id}/invoice`;
  }
  return null;
}
