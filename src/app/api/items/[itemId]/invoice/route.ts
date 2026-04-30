import { readFile } from "fs/promises";
import path from "path";
import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/authenticate-api-request";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    return "application/pdf";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}

function contentDisposition(filename: string | null | undefined): string {
  if (!filename) {
    return "inline";
  }
  const safe = filename.replace(/"/g, "");
  return `inline; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  const authResult = await authenticateApiRequest(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { itemId } = await context.params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      invoiceFileUrl: true,
      invoiceFileName: true,
    },
  });

  if (!item?.invoiceFileUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = item.invoiceFileUrl;
  if (url.startsWith("https://") && url.includes(".vercel-storage.com")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return new NextResponse("Storage de notas não configurado.", { status: 503 });
    }

    const result = await get(url, {
      access: "private",
      token,
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Content-Disposition": contentDisposition(item.invoiceFileName),
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return NextResponse.redirect(url);
  }

  if (url.startsWith("/")) {
    const relative = path.normalize(url.replace(/^\/+/, ""));
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const publicRoot = path.resolve(process.cwd(), "public");
    const abs = path.resolve(publicRoot, relative);
    if (!abs.startsWith(publicRoot + path.sep) && abs !== publicRoot) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    try {
      const body = await readFile(abs);
      return new NextResponse(body, {
        headers: {
          "Content-Type": mimeFromPath(abs),
          "Content-Disposition": contentDisposition(item.invoiceFileName),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
