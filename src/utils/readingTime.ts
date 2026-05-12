export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const clean = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|#\-=]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
