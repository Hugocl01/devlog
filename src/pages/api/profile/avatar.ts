import type { APIRoute } from "astro";
import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024;

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return json({ error: "No autorizado" }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "No se recibió ningún archivo" }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: "Tipo de archivo no permitido. Solo imágenes (JPEG, PNG, GIF, WebP, SVG)" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > MAX_SIZE) {
      return json({ error: "El archivo supera el límite de 5 MB" }, 400);
    }

    const ext = extname(file.name) || ".jpg";
    const filename = `avatar-${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, filename), buffer);

    return json({ ok: true, url: `/uploads/${filename}` }, 201);
  } catch (err) {
    console.error("[api/profile/avatar POST]", err);
    return json({ error: "Error interno al subir el archivo" }, 500);
  }
};
