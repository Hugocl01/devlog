export const prerender = false;
import rss from "@astrojs/rss";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";

export async function GET(context: { site: URL }) {
  const posts = await prisma.post.findMany({
    where: { draft: false, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      description: true,
      content: true,
      author: { select: { name: true } },
      publishedAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  return rss({
    title: "DevLog",
    description: "Artículos sobre desarrollo web, tecnología y proyectos.",
    site: context.site,
    customData: "<language>es</language>",
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.publishedAt ?? new Date(),
      author: post.author?.name ?? undefined,
      categories: post.tags.map((t) => t.tag.name),
      link: `/blog/${post.slug}/`,
      content: renderMarkdown(post.content),
    })),
  });
}
