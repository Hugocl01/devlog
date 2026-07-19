export function slugify(input: string, maxLength?: number): string {
  const slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return maxLength ? slug.slice(0, maxLength) : slug;
}
