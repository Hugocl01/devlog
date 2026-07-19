import { unlink } from "node:fs/promises";
import { join } from "node:path";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Borra un archivo previamente subido a /uploads (p. ej. un avatar reemplazado).
// No hace nada si la URL no apunta a un upload local (evita tocar URLs externas).
export async function deleteUpload(url: string) {
  if (!url.startsWith("/uploads/")) return;
  try {
    await unlink(join(process.cwd(), "public", url));
  } catch {
    // El archivo puede no existir ya; no es crítico
  }
}
