import { readFile } from "fs/promises";
import path from "path";
import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/authenticate-api-request";
import { privateItemImagePathname } from "@/lib/item-image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function attachmentContentDisposition(fileName: string): string {
  const safe = fileName.replace(/[\r\n"]/g, "_").slice(0, 200);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ itemId: string; imageId: string }> },
) {
  const authResult = await authenticateApiRequest(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { itemId, imageId } = await context.params;
  const forceDownload = request.nextUrl.searchParams.get("download") === "1";

  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, itemId },
    select: { url: true, fileName: true },
  });

  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pathname = privateItemImagePathname(image.url);
  if (pathname) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return new NextResponse("Storage não configurado.", { status: 503 });
    }

    const result = await get(pathname, {
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
        ...(forceDownload
          ? { "Content-Disposition": attachmentContentDisposition(image.fileName) }
          : {}),
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (image.url.startsWith("/")) {
    const relative = path.normalize(image.url.replace(/^\/+/, ""));
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
          ...(forceDownload
            ? { "Content-Disposition": attachmentContentDisposition(image.fileName) }
            : {}),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  if (image.url.startsWith("http://") || image.url.startsWith("https://")) {
    return NextResponse.redirect(image.url);
  }

  return new NextResponse("Not found", { status: 404 });
}
