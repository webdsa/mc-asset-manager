"use server";

import { Resend } from "resend";
import { InsuranceStatus } from "@/generated/prisma/client";
import { formatCurrency, formatInsuranceStatus } from "@/lib/format";
import {
  annualInsuranceEstimateAmount,
  parsePurchaseValue,
} from "@/lib/insurance-policy-estimate";
import { loadItemAssetsForInsuranceEmail } from "@/lib/load-item-assets-for-email";

export type InsuranceQuoteFormSnapshot = {
  itemId: string | null;
  name: string;
  categoryName: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  patrimonyCode: string | null;
  qrCode: string | null;
  purchaseYear: string | null;
  purchaseDate: string | null;
  purchaseValueRaw: string | null;
  insuranceStatus: string;
  insurancePolicy: string | null;
  insuranceExpires: string | null;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined) {
  const v = value?.trim() ? escapeHtml(value.trim()) : "—";
  return `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0">${v}</td></tr>`;
}

/** E-mails em cópia (CC), separados por vírgula; ignora duplicatas do destinatário principal. */
function parseCopyRecipients(copyRaw: string | undefined, primaryTo: string): string[] {
  const primary = primaryTo.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (copyRaw ?? "").split(",")) {
    const addr = part.trim();
    if (!addr) {
      continue;
    }
    const key = addr.toLowerCase();
    if (key === primary || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(addr);
  }
  return out;
}

function buildEmailHtml(
  data: InsuranceQuoteFormSnapshot,
  estimate: number | null,
  attachmentFilenames: string[],
  replyToEmails: string[],
) {
  const status =
    Object.values(InsuranceStatus).includes(data.insuranceStatus as InsuranceStatus)
      ? formatInsuranceStatus(data.insuranceStatus)
      : data.insuranceStatus;

  const estimateRow =
    estimate != null
      ? row("Estimativa anual do seguro (referência)", formatCurrency(estimate))
      : "";

  const replyBlock =
    replyToEmails.length > 0
      ? `<p style="margin-bottom:12px;padding:10px 12px;background:#f1f5f9;border-radius:6px;font-size:14px;color:#0f172a"><strong>Respostas:</strong> ao responder este e-mail, a mensagem será direcionada para ${escapeHtml(replyToEmails.join(", "))} <span style="color:#64748b">(Reply-To)</span>.</p>`
      : "";

  const attachmentsBlock =
    attachmentFilenames.length > 0
      ? `<p style="margin-top:16px"><strong>Anexos neste e-mail:</strong> ${escapeHtml(
          attachmentFilenames.join(", "),
        )}</p>`
      : data.itemId?.trim()
        ? `<p style="margin-top:16px;color:#64748b">Não há fotos ou nota fiscal cadastradas para este item — nada foi anexado.</p>`
        : `<p style="margin-top:16px;color:#64748b">Item ainda não salvo: após salvar o cadastro, as fotos e a nota fiscal passam a ser anexadas automaticamente neste envio.</p>`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a;line-height:1.5">
  ${replyBlock}
  <p>Segue os dados do item para elaboração da apólice de seguro.</p>
  <table style="border-collapse:collapse;margin-top:12px">
    ${row("ID do item (sistema)", data.itemId ?? "— (item novo, ainda não salvo)")}
    ${row("Nome", data.name)}
    ${row("Categoria", data.categoryName)}
    ${row("Marca", data.brand)}
    ${row("Modelo", data.model)}
    ${row("Número de série", data.serialNumber)}
    ${row("Código patrimônio", data.patrimonyCode)}
    ${row("Código QR", data.qrCode)}
    ${row("Ano de compra", data.purchaseYear)}
    ${row("Data de compra", data.purchaseDate)}
    ${row("Valor de compra", data.purchaseValueRaw?.trim() ? data.purchaseValueRaw : null)}
    ${row("Status do seguro", status)}
    ${row("Apólice", data.insurancePolicy)}
    ${row("Vencimento do seguro", data.insuranceExpires)}
    ${estimateRow}
  </table>
  ${attachmentsBlock}
</body>
</html>
`.trim();
}

export async function sendInsuranceQuoteEmail(
  data: InsuranceQuoteFormSnapshot,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INSURANCE_QUOTE_EMAIL;
  const copyRaw = process.env.INSURANCE_QUOTE_EMAIL_CC;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Asset Manager <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, message: "Envio não configurado: defina RESEND_API_KEY no ambiente." };
  }
  if (!to?.trim()) {
    return {
      ok: false,
      message: "Destinatário não configurado: defina INSURANCE_QUOTE_EMAIL no ambiente.",
    };
  }

  if (!data.name?.trim()) {
    return { ok: false, message: "Preencha o nome do item antes de enviar." };
  }

  const purchase = parsePurchaseValue(data.purchaseValueRaw ?? "");
  const policy = data.insurancePolicy?.trim() ?? "";
  const estimate =
    purchase != null ? annualInsuranceEstimateAmount(purchase, policy) : null;

  const fileAttachments = await loadItemAssetsForInsuranceEmail(data.itemId);
  const attachmentFilenames = fileAttachments.map((a) => a.filename);

  const toTrimmed = to.trim();
  const cc = parseCopyRecipients(copyRaw, toTrimmed);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [toTrimmed],
    ...(cc.length > 0
      ? {
          cc,
          replyTo: cc.length === 1 ? cc[0] : cc,
        }
      : {}),
    subject: `Solicitação de apólice — ${data.name.trim()}`,
    html: buildEmailHtml(data, estimate, attachmentFilenames, cc),
    ...(fileAttachments.length > 0
      ? {
          attachments: fileAttachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }
      : {}),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
