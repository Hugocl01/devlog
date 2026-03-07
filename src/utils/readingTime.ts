export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200; // Un estándar común
  const words = text.trim().split(/\s+/).length;
  const minutes = words / wordsPerMinute;
  return Math.ceil(minutes);
}
