import { prisma } from "@/lib/prisma";
import { tagUrl } from "@/utils/tag";

export const prerender = false;

const formatDate = (date: Date) => date.toISOString().split("T")[0];

const entry = ({
  url,
  priority,
  changefreq,
  lastmod,
}: {
  url: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}) => `  <url>
    <loc>${url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export async function GET({ site }: { site: URL }) {
  const [posts, updates, tags] = await Promise.all([
    prisma.post.findMany({
      where: { draft: false, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, publishedAt: true },
    }),
    prisma.update.findMany({
      where: { draft: false, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, publishedAt: true },
    }),
    prisma.tag.findMany({ select: { name: true } }),
  ]);

  const latestPost = posts[0]?.publishedAt;
  const base = (path: string) => new URL(path, site).toString();

  const urls = [
    entry({ url: base("/"), priority: "1.0", changefreq: "weekly", lastmod: latestPost ? formatDate(latestPost) : undefined }),
    entry({ url: base("/blog/"), priority: "0.9", changefreq: "weekly", lastmod: latestPost ? formatDate(latestPost) : undefined }),
    entry({ url: base("/about/"), priority: "0.6", changefreq: "monthly" }),
    entry({ url: base("/contact/"), priority: "0.5", changefreq: "yearly" }),
    entry({ url: base("/tags/"), priority: "0.6", changefreq: "monthly" }),
    entry({ url: base("/updates/"), priority: "0.6", changefreq: "monthly" }),
    entry({ url: base("/privacy/"), priority: "0.3", changefreq: "yearly" }),
    entry({ url: base("/terms/"), priority: "0.3", changefreq: "yearly" }),
    entry({ url: base("/legal-notice/"), priority: "0.3", changefreq: "yearly" }),
    ...posts.map((p) =>
      entry({ url: base(`/blog/${p.slug}/`), priority: "0.8", changefreq: "monthly", lastmod: p.publishedAt ? formatDate(p.publishedAt) : undefined })
    ),
    ...updates.map((u) =>
      entry({ url: base(`/updates/${u.slug}/`), priority: "0.6", changefreq: "monthly", lastmod: u.publishedAt ? formatDate(u.publishedAt) : undefined })
    ),
    ...tags.map((tag) =>
      entry({ url: base(`/tags/${tagUrl(tag.name)}/`), priority: "0.6", changefreq: "monthly" })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
