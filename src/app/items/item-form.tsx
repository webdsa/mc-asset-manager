import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  Camera,
  FileUp,
  MapPin,
  PackageCheck,
  Save,
  Shield,
} from "lucide-react";
import { InsuranceStatus, ItemCondition } from "@/generated/prisma/client";
import { formatCondition, formatInsuranceStatus } from "@/lib/format";
import { itemInvoiceDownloadHref } from "@/lib/invoice";
import { AnnualInsuranceEstimate } from "@/app/items/annual-insurance-estimate";
import { EditItemImagesPanel } from "@/app/items/edit-item-images-panel";
import { InsuranceQuoteEmailButton } from "@/app/items/insurance-quote-email-button";
import { PurchaseValueField } from "@/app/items/purchase-value-field";
import { INSURANCE_POLICY_OPTIONS } from "@/lib/insurance-policy-estimate";
import { PageHeader } from "@/components/page-header";

export type ItemFormCategory = { id: string; name: string };

export type ItemFormInitial = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  patrimonyCode: string | null;
  quantity: number;
  location: string | null;
  purchaseYear: number;
  purchaseDate: Date | null;
  purchaseValue: { toString(): string } | null;
  supplier: string | null;
  condition: ItemCondition;
  insuranceStatus: InsuranceStatus;
  insurancePolicy: string | null;
  insuranceExpires: Date | null;
  warrantyExpires: Date | null;
  notes: string | null;
  invoiceFileUrl: string | null;
  /** Fotos já salvas (modo edição). */
  images?: { id: string; url: string; alt: string | null; fileName: string }[];
};

const ITEM_FORM_ID = "item-form";

function initialPurchaseForEstimate(
  purchaseValue: ItemFormInitial["purchaseValue"],
): number | null {
  if (purchaseValue == null || purchaseValue === undefined) {
    return null;
  }
  const n = Number(purchaseValue);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ItemForm({
  categories,
  action,
  submitLabel,
  initial,
  backHref = "/admin",
  backLabel = "Voltar ao inventário",
  headingEyebrow,
  headingTitle,
}: {
  categories: ItemFormCategory[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initial?: ItemFormInitial | null;
  backHref?: string;
  backLabel?: string;
  headingEyebrow: string;
  headingTitle: string;
}) {
  const isEdit = Boolean(initial?.id);
  const currentYear = new Date().getFullYear();
  const initialPurchaseAmount =
    initial?.purchaseValue != null && initial.purchaseValue !== undefined
      ? Number(initial.purchaseValue)
      : null;

  const invoiceDownloadHref = initial
    ? itemInvoiceDownloadHref({
        id: initial.id,
        invoiceFileUrl: initial.invoiceFileUrl ?? null,
      })
    : null;

  const savedInsurancePolicy = (initial?.insurancePolicy ?? "").trim();
  const legacyInsurancePolicy =
    savedInsurancePolicy &&
    !(INSURANCE_POLICY_OPTIONS as readonly string[]).includes(savedInsurancePolicy)
      ? savedInsurancePolicy
      : null;

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <PageHeader innerClassName="flex flex-col gap-4">
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-petroleum-800 transition hover:text-primary"
          >
            <ArrowLeft size={17} />
            {backLabel}
          </Link>
          <div>
            <p className="text-sm font-medium text-primary">{headingEyebrow}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">{headingTitle}</h1>
          </div>
      </PageHeader>

      <form
        id={ITEM_FORM_ID}
        action={action}
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8"
      >
        {isEdit && initial ? <input type="hidden" name="itemId" value={initial.id} /> : null}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Section
              icon={<PackageCheck size={20} />}
              title="Identificação"
              description="Dados principais para encontrar e distinguir o item."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome do item" required>
                  <input
                    name="name"
                    required
                    className={inputClass}
                    placeholder="Ex: Sony FX3"
                    defaultValue={initial?.name ?? ""}
                  />
                </Field>
                <Field label="Categoria" required>
                  <select
                    name="categoryId"
                    required
                    className={inputClass}
                    defaultValue={initial?.categoryId ?? ""}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Marca">
                  <input
                    name="brand"
                    className={inputClass}
                    placeholder="Sony, Aputure..."
                    defaultValue={initial?.brand ?? ""}
                  />
                </Field>
                <Field label="Modelo">
                  <input
                    name="model"
                    className={inputClass}
                    placeholder="FX3, 600D..."
                    defaultValue={initial?.model ?? ""}
                  />
                </Field>
                <Field label="Número de série">
                  <input
                    name="serialNumber"
                    className={inputClass}
                    placeholder="Opcional"
                    defaultValue={initial?.serialNumber ?? ""}
                  />
                </Field>
                <Field label="Código patrimônio">
                  <input
                    name="patrimonyCode"
                    className={inputClass}
                    placeholder="Opcional"
                    defaultValue={initial?.patrimonyCode ?? ""}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Estado">
                  <select
                    name="condition"
                    className={inputClass}
                    defaultValue={initial?.condition ?? ItemCondition.GOOD}
                  >
                    {Object.values(ItemCondition).map((condition) => (
                      <option key={condition} value={condition}>
                        {formatCondition(condition)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Quantidade" required>
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    step={1}
                    required
                    className={inputClass}
                    placeholder="1"
                    defaultValue={initial?.quantity ?? 1}
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea
                  name="description"
                  rows={3}
                  className={textareaClass}
                  placeholder="Kit, acessórios incluídos, uso principal..."
                  defaultValue={initial?.description ?? ""}
                />
              </Field>
            </Section>

            <Section
              icon={<BadgeDollarSign size={20} />}
              title="Compra e documentação"
              description="Informações úteis para contabilidade, manutenção e reposição."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ano de compra" required>
                  <input
                    name="purchaseYear"
                    type="number"
                    min="1970"
                    max={currentYear + 1}
                    required
                    className={inputClass}
                    placeholder={String(currentYear)}
                    defaultValue={initial?.purchaseYear ?? ""}
                  />
                </Field>
                <Field label="Data de compra">
                  <input
                    name="purchaseDate"
                    type="date"
                    className={inputClass}
                    defaultValue={toDateInputValue(initial?.purchaseDate ?? null)}
                  />
                </Field>
                <Field label="Valor de compra">
                  <PurchaseValueField
                    name="purchaseValue"
                    className={inputClass}
                    initialAmount={
                      initialPurchaseAmount != null && Number.isFinite(initialPurchaseAmount)
                        ? initialPurchaseAmount
                        : null
                    }
                  />
                </Field>
                <Field label="Fornecedor">
                  <input
                    name="supplier"
                    className={inputClass}
                    placeholder="Loja ou vendedor"
                    defaultValue={initial?.supplier ?? ""}
                  />
                </Field>
                <Field label="Garantia até">
                  <input
                    name="warrantyExpires"
                    type="date"
                    className={inputClass}
                    defaultValue={toDateInputValue(initial?.warrantyExpires ?? null)}
                  />
                </Field>
                <Field label="Nota fiscal">
                  {invoiceDownloadHref ? (
                    <p className="mb-2 text-xs text-slate-500">
                      Arquivo atual:{" "}
                      <a
                        href={invoiceDownloadHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-700 underline hover:text-slate-950"
                      >
                        abrir nota
                      </a>
                      . Envie outro arquivo abaixo para substituir.
                    </p>
                  ) : null}
                  <FileInput
                    name="invoice"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    icon={<FileUp size={18} />}
                    label="PDF ou imagem"
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={<Shield size={20} />}
              title="Seguro"
              description="Acompanhe apólice, vencimento e pendências."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status do seguro">
                  <select
                    name="insuranceStatus"
                    className={inputClass}
                    defaultValue={initial?.insuranceStatus ?? InsuranceStatus.NOT_INSURED}
                  >
                    {Object.values(InsuranceStatus).map((status) => (
                      <option key={status} value={status}>
                        {formatInsuranceStatus(status)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Vencimento do seguro">
                  <input
                    name="insuranceExpires"
                    type="date"
                    className={inputClass}
                    defaultValue={toDateInputValue(initial?.insuranceExpires ?? null)}
                  />
                </Field>
                <Field label="Apólice">
                  <select
                    name="insurancePolicy"
                    className={inputClass}
                    defaultValue={savedInsurancePolicy}
                  >
                    <option value="">Opcional</option>
                    {legacyInsurancePolicy ? (
                      <option value={legacyInsurancePolicy}>{legacyInsurancePolicy}</option>
                    ) : null}
                    {INSURANCE_POLICY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex flex-col gap-4 sm:col-span-2">
                  <AnnualInsuranceEstimate
                    formId={ITEM_FORM_ID}
                    initialPurchase={initialPurchaseForEstimate(initial?.purchaseValue ?? null)}
                    initialPolicy={savedInsurancePolicy}
                  />
                  <InsuranceQuoteEmailButton
                    formId={ITEM_FORM_ID}
                    categories={categories}
                  />
                </div>
              </div>
            </Section>
          </div>

          <aside className="space-y-6">
            <Section
              icon={<Camera size={20} />}
              title="Arquivos"
              description={
                isEdit
                  ? "Novas imagens são adicionadas às existentes."
                  : "Imagens ajudam a reconhecer o item rapidamente."
              }
            >
              <Field label="Imagens do item">
                {initial?.images && initial.images.length > 0 ? (
                  <EditItemImagesPanel
                    itemId={initial.id}
                    itemName={initial.name}
                    images={initial.images}
                  />
                ) : isEdit ? (
                  <p className="mb-3 text-xs text-slate-500">Nenhuma foto cadastrada ainda.</p>
                ) : null}
                <FileInput
                  name="images"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  icon={<Camera size={18} />}
                  label="JPG, PNG ou WebP"
                />
              </Field>
            </Section>

            <Section
              icon={<MapPin size={20} />}
              title="Operação"
              description="Onde está e o que a equipe precisa saber."
            >
              <Field label="Localização">
                <input
                  name="location"
                  className={inputClass}
                  placeholder="Sala, armário, set..."
                  defaultValue={initial?.location ?? ""}
                />
              </Field>
              <Field label="Observações">
                <textarea
                  name="notes"
                  rows={6}
                  className={textareaClass}
                  placeholder="Cuidados, pendências, acessórios faltando..."
                  defaultValue={initial?.notes ?? ""}
                />
              </Field>
            </Section>

            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover">
              <Save size={18} />
              {submitLabel}
            </button>
          </aside>
        </div>
      </form>
    </main>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

const textareaClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-petroleum-900/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-petroleum-800/10 text-petroleum-800">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function FileInput({
  icon,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 transition hover:border-slate-400 hover:bg-white">
      <span className="flex flex-col items-center gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm">
          {icon}
        </span>
        <span>{label}</span>
        <input type="file" className="w-full max-w-56 text-xs" {...props} />
      </span>
    </span>
  );
}
