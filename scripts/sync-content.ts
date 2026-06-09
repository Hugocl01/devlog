/**
 * Syncs markdown content (posts + updates) into the database.
 * Run with: npm run sync
 * Idempotent — safe to re-run; uses upsert throughout.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ROOT = resolve(process.cwd());
const POSTS_DIR = join(ROOT, "src/content/posts");
const UPDATES_DIR = join(ROOT, "src/content/updates");

// ── Frontmatter parser ────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const [, yaml, body] = match;
  const data: Record<string, unknown> = {};

  for (const line of yaml.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();
    if (!rawVal) continue;

    if (rawVal.startsWith("[")) {
      try { data[key] = JSON.parse(rawVal); } catch { data[key] = []; }
    } else if (rawVal === "true") {
      data[key] = true;
    } else if (rawVal === "false") {
      data[key] = false;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawVal)) {
      data[key] = new Date(rawVal + "T00:00:00Z");
    } else {
      data[key] = rawVal.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: body.trim() };
}

function readingTime(content: string) {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function postSlug(title: string, date: Date | null): string {
  const datePart = (date ?? new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  return `post-${datePart}-${slugify(title).slice(0, 50)}`;
}

function updateSlug(title: string, date: Date | null): string {
  const datePart = (date ?? new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  return `update-${datePart}-${slugify(title).slice(0, 50)}`;
}

// ── Update type defaults ──────────────────────────────────────────────────────

const UPDATE_TYPE_DEFAULTS = [
  { name: "feature",     label: "Nueva función",      color: "#22c55e" },
  { name: "bugfix",      label: "Corrección de error", color: "#ef4444" },
  { name: "improvement", label: "Mejora",              color: "#3b82f6" },
  { name: "general",     label: "General",             color: "#6b7280" },
];

// ── User lookup (author resolution) ──────────────────────────────────────────

async function buildUserMap(): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  return new Map(users.map((u) => [u.name.toLowerCase(), u.id]));
}

function resolveAuthorId(name: string | undefined, userMap: Map<string, string>): string | null {
  if (!name) return null;
  return userMap.get(name.toLowerCase()) ?? null;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function syncPosts(userMap: Map<string, string>) {
  // Clean all existing posts so re-running with new slugs is fully idempotent
  await prisma.postTag.deleteMany({});
  await prisma.post.deleteMany({});

  const files = readdirSync(POSTS_DIR).filter((f) => /\.(md|mdx)$/.test(f)).sort();
  console.log(`\n📝 Syncing ${files.length} posts...`);

  for (const file of files) {
    const raw = readFileSync(join(POSTS_DIR, file), "utf-8");
    const parsed = parseFrontmatter(raw);
    if (!parsed) { console.warn(`  ⚠  Skipping ${file}: malformed frontmatter`); continue; }

    const { data, body } = parsed;
    const draft = data.draft as boolean ?? false;
    const date = data.date instanceof Date ? data.date : null;
    const slug = postSlug(data.title as string, date);
    const authorId = resolveAuthorId(data.author as string | undefined, userMap);

    const post = await prisma.post.upsert({
      where: { slug },
      create: {
        slug,
        title: data.title as string,
        description: data.description as string,
        content: body,
        authorId,
        draft,
        readingTime: readingTime(body),
        publishedAt: draft ? null : date,
      },
      update: {
        title: data.title as string,
        description: data.description as string,
        content: body,
        authorId,
        draft,
        readingTime: readingTime(body),
        publishedAt: draft ? null : date,
      },
      select: { id: true },
    });

    // Sync tags
    const tags = (data.tags as string[]) ?? [];
    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const tagName of tags) {
      const tagSlug = slugify(tagName);
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, slug: tagSlug },
        update: { slug: tagSlug },
        select: { id: true },
      });
      await prisma.postTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId: tag.id } },
        create: { postId: post.id, tagId: tag.id },
        update: {},
      });
    }

    const label = draft ? "[borrador]" : "[publicado]";
    console.log(`  ✓  ${slug} ${label}`);
  }
}

// ── Updates ───────────────────────────────────────────────────────────────────

async function syncUpdates(userMap: Map<string, string>) {
  // Ensure all update types exist
  for (const ut of UPDATE_TYPE_DEFAULTS) {
    await prisma.updateType.upsert({
      where: { name: ut.name },
      create: ut,
      update: { label: ut.label, color: ut.color },
    });
  }

  // Clean all existing updates so re-running with new slugs is fully idempotent
  await prisma.update.deleteMany({});

  const files = readdirSync(UPDATES_DIR).filter((f) => /\.(md|mdx)$/.test(f)).sort();
  console.log(`\n🔄 Syncing ${files.length} updates...`);

  for (const file of files) {
    const raw = readFileSync(join(UPDATES_DIR, file), "utf-8");
    const parsed = parseFrontmatter(raw);
    if (!parsed) { console.warn(`  ⚠  Skipping ${file}: malformed frontmatter`); continue; }

    const { data, body } = parsed;
    const typeName = (data.type as string) ?? "general";
    const draft = data.draft as boolean ?? false;
    const date = data.date instanceof Date ? data.date : null;
    const slug = updateSlug(data.title as string, date);
    const authorId = resolveAuthorId(data.author as string | undefined, userMap);

    const updateType = await prisma.updateType.findUnique({ where: { name: typeName } });
    if (!updateType) { console.warn(`  ⚠  Unknown type "${typeName}" for ${file}`); continue; }

    await prisma.update.upsert({
      where: { slug },
      create: {
        slug,
        title: data.title as string,
        description: data.description as string,
        content: body,
        authorId,
        draft,
        readingTime: readingTime(body),
        publishedAt: draft ? null : date,
        typeId: updateType.id,
      },
      update: {
        title: data.title as string,
        description: data.description as string,
        content: body,
        authorId,
        draft,
        readingTime: readingTime(body),
        publishedAt: draft ? null : date,
        typeId: updateType.id,
      },
    });

    const label = draft ? "[borrador]" : "[publicado]";
    console.log(`  ✓  ${slug} ${label}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const userMap = await buildUserMap();
  console.log(`👤 ${userMap.size} usuario(s) encontrado(s) para resolución de autor`);
  await syncPosts(userMap);
  await syncUpdates(userMap);
  console.log("\n✅ Sync completo!\n");
}

main()
  .catch((err) => {
    console.error("❌ Sync fallido:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
