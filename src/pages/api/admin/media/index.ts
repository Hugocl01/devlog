import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { json, isAdmin } from "@/lib/api";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/upload";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return json({ media });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "No se recibió ningún archivo" }, 400);
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return json({ error: "Tipo de archivo no permitido. Solo imágenes (JPEG, PNG, GIF, WebP)" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return json({ error: "El archivo supera el límite de 5 MB" }, 400);
    }

    const ext = extname(file.name) || ".bin";
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, filename), buffer);

    const media = await prisma.media.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: buffer.byteLength,
        url: `/uploads/${filename}`,
        uploadedById: locals.user?.id ?? null,
      },
    });

    await logAudit(locals, "CREATE", "media", String(media.id), { filename, originalName: file.name });

    return json({ ok: true, media }, 201);
  } catch (err) {
    console.error("[api/admin/media POST]", err);
    return json({ error: "Error interno al subir el archivo" }, 500);
  }
};
