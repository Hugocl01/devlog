import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}

export function parseHeadings(content: string): { depth: number; slug: string; text: string }[] {
  const headings: { depth: number; slug: string; text: string }[] = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[2].replace(/[*_`]/g, "").trim();
    const slug = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    headings.push({ depth: match[1].length, slug, text });
  }
  return headings;
}
