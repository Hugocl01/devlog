import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { json, isAdmin } from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!isAdmin(locals)) return json({ error: "No autorizado" }, 403);

  const slug = params.slug!;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      description: true,
      content: true,
      coverImage: true,
      draft: true,
      publishedAt: true,
      readingTime: true,
      author: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!post) return json({ error: "Post no encontrado" }, 404);

  const tags = post.tags.map((t) => t.tag.name);
  const date = post.publishedAt ? post.publishedAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const frontmatter = [
    "---",
    `title: "${post.title.replace(/"/g, '\\"')}"`,
    `description: "${post.description.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    post.author?.name ? `author: "${post.author.name}"` : null,
    tags.length > 0 ? `tags: [${tags.map((t) => `"${t}"`).join(", ")}]` : null,
    post.coverImage ? `coverImage: "${post.coverImage}"` : null,
    post.readingTime ? `readingTime: ${post.readingTime}` : null,
    `draft: ${post.draft}`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const markdown = `${frontmatter}\n\n${post.content}`;

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
};
