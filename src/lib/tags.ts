import { prisma } from "@/lib/prisma";
import { slugify } from "@/utils/slug";

export async function applyTags(postId: number, tags: string[]) {
  await prisma.postTag.deleteMany({ where: { postId } });

  await Promise.all(
    tags.map(async (name) => {
      const slug = slugify(name);
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
        select: { id: true },
      });
      await prisma.postTag.upsert({
        where: { postId_tagId: { postId, tagId: tag.id } },
        create: { postId, tagId: tag.id },
        update: {},
      });
    })
  );
}
