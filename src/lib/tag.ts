/**
 * Convierte un tag en URL segura.
 */
export function tagUrl(tag: string) {
  const slug = tag
    .toLowerCase() // 1. Convierte todo a minúsculas
    .normalize("NFD") // 2. Normaliza caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // 3. Elimina tildes y diacríticos
    .replace(/\s+/g, "-") // 4. Reemplaza espacios por guiones
    .replace(/[^a-z0-9-]/g, ""); // 5. Elimina cualquier caracter que no sea letra, número o guion

  return slug;
}