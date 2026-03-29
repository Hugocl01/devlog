import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  return rss({
    title: "DevLog",
    description: "Artículos sobre desarrollo web, PHP, JS y tooling",
    site: context.site,
    items: posts
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        author: post.data.author,
        categories: post.data.tags,
        link: `/blog/${post.id}/`,
        content: post.rendered?.html ?? "",
      })),
  });
}
