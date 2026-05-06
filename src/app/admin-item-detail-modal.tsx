"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, FileText, MapPin, Pencil, X } from "lucide-react";
import { ItemImageLightbox } from "@/app/items/item-image-lightbox";
import type { AdminSerializedItem } from "@/lib/admin-serialized-item";
import {
  formatCondition,
  formatCurrency,
  formatDate,
  formatInsuranceStatus,
} from "@/lib/format";
import {
  itemImageDisplaySrc,
  itemImageNeedsUnoptimizedNextImage,
} from "@/lib/item-image";

const insuranceTone: Record<string, string> = {
  INSURED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  EXPIRED: "border-rose-200 bg-rose-50 text-rose-700",
  NOT_INSURED: "border-slate-200 bg-slate-100 text-slate-600",
};

function DetailRow({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}

export function AdminItemDetailModal({
  item,
  onClose,
}: {
  item: AdminSerializedItem | null;
  onClose: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  const closeImageLightbox = useCallback(() => {
    setLightboxOpen(false);
    queueMicrotask(() => {
      if (item) {
        document.body.style.overflow = "hidden";
      }
    });
  }, [item]);

  useEffect(() => {
    if (!item) {
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (lightboxOpen) {
        return;
      }
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [item, onClose, lightboxOpen]);

  useEffect(() => {
    if (!item) {
      setLightboxOpen(false);
    }
  }, [item]);

  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-item-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-petroleum-950/50 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative z-[81] flex max-h-[min(92vh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-petroleum-900/15 bg-white shadow-2xl"
        data-modal-ignore
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Asset</p>
            <h2 id="admin-item-detail-title" className="mt-1 text-lg font-semibold leading-snug text-slate-950">
              {item.name}
            </h2>
            <span
              className="mt-2 inline-flex max-w-full rounded-md px-2.5 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: item.category.color }}
            >
              <span className="truncate">{item.category.name}</span>
            </span>
            {item.hiddenAt ? (
              <p className="mt-2 text-xs text-rose-700">
                Excluído em {formatDate(item.hiddenAt)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {item.images.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {item.images.map((img, index) => {
                const src = itemImageDisplaySrc(item.id, img);
                return (
                  <button
                    key={img.id}
                    type="button"
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left outline-none ring-primary/40 transition hover:border-primary/35 focus-visible:ring-2"
                    aria-label={`Ampliar foto ${index + 1} de ${item.images.length}`}
                    onClick={() => {
                      setLightboxInitialIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    <Image
                      src={src}
                      alt={img.alt ?? item.name}
                      fill
                      className="object-cover transition group-hover:opacity-95"
                      sizes="(max-width: 640px) 50vw, 200px"
                      unoptimized={itemImageNeedsUnoptimizedNextImage(src)}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-petroleum-950/0 transition group-hover:bg-petroleum-950/10"
                      aria-hidden
                    />
                    {item.images.length > 1 ? (
                      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-petroleum-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        {index + 1}/{item.images.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow
              label="Descrição"
              value={
                item.description?.trim() ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{item.description}</p>
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
              fullWidth
            />
            <DetailRow
              label="Marca / modelo / série / património"
              value={
                [item.brand, item.model, item.serialNumber, item.patrimonyCode]
                  .filter(Boolean)
                  .join(" • ") || "—"
              }
              fullWidth
            />
            <DetailRow
              label="Código QR"
              value={
                item.qrCode?.trim() ? (
                  /^https?:\/\//i.test(item.qrCode.trim()) ? (
                    <a
                      href={item.qrCode.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-medium text-primary underline hover:text-primary-hover"
                    >
                      {item.qrCode.trim()}
                    </a>
                  ) : (
                    <span className="break-all">{item.qrCode.trim()}</span>
                  )
                ) : (
                  "—"
                )
              }
              fullWidth
            />
            <DetailRow label="Quantidade" value={String(item.quantity)} />
            <DetailRow
              label="Condição"
              value={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={14} className="shrink-0 text-slate-400" />
                  {formatCondition(item.condition)}
                </span>
              }
            />
            <DetailRow
              label="Local"
              value={
                <span className="inline-flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  {item.location || "—"}
                </span>
              }
              fullWidth
            />
            <DetailRow label="Ano de compra" value={String(item.purchaseYear)} />
            <DetailRow
              label="Data de compra"
              value={item.purchaseDate ? formatDate(item.purchaseDate) : "—"}
            />
            <DetailRow
              label="Valor declarado"
              value={formatCurrency(item.purchaseValue)}
            />
            <DetailRow label="Fornecedor" value={item.supplier || "—"} />
            <DetailRow
              label="Seguro"
              value={
                <span className="inline-flex flex-col gap-1">
                  <span
                    className={`inline-flex w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      insuranceTone[item.insuranceStatus] ?? insuranceTone.NOT_INSURED
                    }`}
                  >
                    {formatInsuranceStatus(item.insuranceStatus)}
                  </span>
                  {item.insuranceCompany ? (
                    <span className="text-slate-600">Seguradora: {item.insuranceCompany}</span>
                  ) : null}
                  {item.insurancePolicy ? (
                    <span className="text-slate-600">Apólice: {item.insurancePolicy}</span>
                  ) : null}
                  {item.insuranceExpires ? (
                    <span className="text-slate-600">
                      Validade: {formatDate(item.insuranceExpires)}
                    </span>
                  ) : null}
                </span>
              }
              fullWidth
            />
            <DetailRow
              label="Garantia até"
              value={item.warrantyExpires ? formatDate(item.warrantyExpires) : "—"}
            />
            <DetailRow
              label="Nota fiscal"
              value={
                item.invoiceHref ? (
                  <a
                    href={item.invoiceHref}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={16} />
                    Abrir / transferir
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Observações"
              value={
                item.notes?.trim() ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{item.notes}</p>
                ) : (
                  <span className="text-slate-500">—</span>
                )
              }
              fullWidth
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
          <Link
            href={`/items/${item.id}/edit`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:w-auto"
            onClick={onClose}
          >
            <Pencil size={18} />
            Editar cadastro
          </Link>
        </div>
      </div>

      <ItemImageLightbox
        open={lightboxOpen}
        onClose={closeImageLightbox}
        itemId={item.id}
        itemName={item.name}
        images={item.images}
        initialIndex={lightboxInitialIndex}
      />
    </div>
  );
}
