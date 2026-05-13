import { getCollection } from "astro:content";
import { tagUrl } from "@/utils/tag";

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
  const posts = (await getCollection("posts"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const updates = (await getCollection("updates"))
    .filter((u) => !u.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const tags = [...new Set(posts.flatMap((p) => p.data.tags ?? []))];
  const latestPost = posts[0]?.data.date;

  const base = (path: string) => new URL(path, site).toString();

  const urls = [
    entry({ url: base("/"), priority: "1.0", changefreq: "weekly", lastmod: latestPost ? formatDate(latestPost) : undefined }),
    entry({ url: base("/blog/"), priority: "0.9", changefreq: "weekly", lastmod: latestPost ? formatDate(latestPost) : undefined }),
    entry({ url: base("/about/"), priority: "0.6", changefreq: "monthly" }),
    entry({ url: base("/contact/"), priority: "0.5", changefreq: "yearly" }),
    entry({ url: base("/tags/"), priority: "0.6", changefreq: "monthly" }),
    entry({ url: base("/updates/"), priority: "0.6", changefreq: "monthly" }),
    ...posts.map((p) =>
      entry({ url: base(`/blog/${p.id}/`), priority: "0.8", changefreq: "monthly", lastmod: formatDate(p.data.date) })
    ),
    ...updates.map((u) =>
      entry({ url: base(`/updates/${u.id}/`), priority: "0.6", changefreq: "monthly", lastmod: formatDate(u.data.date) })
    ),
    ...tags.map((tag) =>
      entry({ url: base(`/tags/${tagUrl(tag)}/`), priority: "0.6", changefreq: "monthly" })
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
