import type { APIRoute } from "astro";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { zipSync } from "fflate";

export const prerender = false;

function isAdmin(locals: App.Locals) {
  return locals.user?.roleId === 2;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/\r?\n/g, " ");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function dateFilter(from: string | null, to: string | null) {
  if (!from && !to) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (from) filter.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    filter.lte = d;
  }
  return filter;
}

function postFrontmatter(p: {
  slug: string; title: string; description: string;
  draft: boolean; readingTime: number | string | null;
  publishedAt: Date | null; coverImage?: string | null;
  author?: { name: string } | null;
  tags: Array<{ tag: { name: string } }>;
}): string {
  const date = p.publishedAt ? p.publishedAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const tags = p.tags.map((t) => t.tag.name);
  return [
    "---",
    `title: "${p.title.replace(/"/g, '\\"')}"`,
    `description: "${p.description.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    p.author?.name ? `author: "${p.author.name}"` : null,
    tags.length > 0 ? `tags: [${tags.map((t) => `"${t}"`).join(", ")}]` : null,
    p.coverImage ? `coverImage: "${p.coverImage}"` : null,
    p.readingTime ? `readingTime: ${p.readingTime}` : null,
    `draft: ${p.draft}`,
    "---",
  ].filter(Boolean).join("\n");
}

function updateFrontmatter(u: {
  slug: string; title: string; description: string;
  draft: boolean; readingTime: number | string | null;
  publishedAt: Date | null;
  author?: { name: string } | null;
  type: { name: string; label: string };
}): string {
  const date = u.publishedAt ? u.publishedAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return [
    "---",
    `title: "${u.title.replace(/"/g, '\\"')}"`,
    `description: "${u.description.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    u.author?.name ? `author: "${u.author.name}"` : null,
    `type: "${u.type.name}"`,
    u.readingTime ? `readingTime: ${u.readingTime}` : null,
    `draft: ${u.draft}`,
    "---",
  ].filter(Boolean).join("\n");
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchPosts(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const posts = await prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      slug: true, title: true, description: true, content: true,
      coverImage: true, draft: true, readingTime: true,
      metaTitle: true, canonical: true,
      publishedAt: true, createdAt: true, updatedAt: true,
      author: { select: { name: true, email: true } },
      _count: { select: { views: true, comments: true, reactions: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  return posts.map((p) => ({
    slug: p.slug, title: p.title, description: p.description,
    content: p.content, coverImage: p.coverImage ?? "",
    draft: p.draft, readingTime: p.readingTime ?? "",
    metaTitle: p.metaTitle ?? "", canonical: p.canonical ?? "",
    publishedAt: p.publishedAt?.toISOString() ?? "",
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    author: p.author?.name ?? "", authorEmail: p.author?.email ?? "",
    tags: p.tags.map((t) => t.tag.name).join(", "),
    views: p._count.views, comments: p._count.comments, reactions: p._count.reactions,
  }));
}

async function fetchPostsRaw(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  return prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      slug: true, title: true, description: true, content: true,
      coverImage: true, draft: true, readingTime: true,
      publishedAt: true,
      author: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
}

async function fetchUpdates(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const updates = await prisma.update.findMany({
    orderBy: { publishedAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      slug: true, title: true, description: true, content: true,
      draft: true, readingTime: true, metaTitle: true, canonical: true,
      publishedAt: true, createdAt: true, updatedAt: true,
      author: { select: { name: true, email: true } },
      type: { select: { name: true, label: true } },
      _count: { select: { views: true } },
    },
  });
  return updates.map((u) => ({
    slug: u.slug, title: u.title, description: u.description,
    content: u.content, draft: u.draft, readingTime: u.readingTime ?? "",
    metaTitle: u.metaTitle ?? "", canonical: u.canonical ?? "",
    publishedAt: u.publishedAt?.toISOString() ?? "",
    createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString(),
    author: u.author?.name ?? "", authorEmail: u.author?.email ?? "",
    type: u.type.name, typeLabel: u.type.label,
    views: u._count.views,
  }));
}

async function fetchUpdatesRaw(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  return prisma.update.findMany({
    orderBy: { publishedAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      slug: true, title: true, description: true, content: true,
      draft: true, readingTime: true, publishedAt: true,
      author: { select: { name: true } },
      type: { select: { name: true, label: true } },
    },
  });
}

async function fetchUsers(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      id: true, name: true, email: true,
      emailVerified: true, avatar: true, bio: true,
      banned: true, bannedAt: true, createdAt: true, updatedAt: true,
      role: { select: { name: true } },
      _count: { select: { comments: true, reactions: true, posts: true, updates: true } },
    },
  });
  return users.map((u) => ({
    id: u.id, name: u.name, email: u.email,
    role: u.role.name, emailVerified: u.emailVerified,
    avatar: u.avatar ?? "", bio: u.bio ?? "",
    banned: u.banned, bannedAt: u.bannedAt?.toISOString() ?? "",
    createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString(),
    posts: u._count.posts, updates: u._count.updates,
    comments: u._count.comments, reactions: u._count.reactions,
  }));
}

async function fetchComments(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      id: true, content: true, deleted: true, banned: true,
      createdAt: true, updatedAt: true,
      user: { select: { name: true, email: true } },
      post: { select: { slug: true, title: true } },
      parentId: true,
    },
  });
  return comments.map((c) => ({
    id: c.id, content: c.content,
    deleted: c.deleted, banned: c.banned,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
    author: c.user.name, authorEmail: c.user.email,
    postSlug: c.post.slug, postTitle: c.post.title,
    parentId: c.parentId ?? "",
  }));
}

async function fetchTags() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, color: true, createdAt: true,
      _count: { select: { posts: true } },
    },
  });
  return tags.map((t) => ({
    id: t.id, name: t.name, slug: t.slug, color: t.color ?? "",
    createdAt: t.createdAt.toISOString(), posts: t._count.posts,
  }));
}

async function fetchReactions(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const reactions = await prisma.reaction.findMany({
    orderBy: { createdAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      id: true, createdAt: true,
      post: { select: { slug: true, title: true } },
      type: { select: { name: true, emoji: true, label: true } },
      user: { select: { name: true, email: true } },
    },
  });
  return reactions.map((r) => ({
    id: r.id, createdAt: r.createdAt.toISOString(),
    postSlug: r.post.slug, postTitle: r.post.title,
    type: r.type.name, emoji: r.type.emoji, typeLabel: r.type.label,
    user: r.user?.name ?? "", userEmail: r.user?.email ?? "",
  }));
}

async function fetchMedia(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      id: true, filename: true, originalName: true,
      mimeType: true, size: true, url: true, createdAt: true,
      uploadedBy: { select: { name: true, email: true } },
    },
  });
  return media.map((m) => ({
    id: m.id, filename: m.filename, originalName: m.originalName,
    mimeType: m.mimeType, size: m.size, url: m.url,
    createdAt: m.createdAt.toISOString(),
    uploadedBy: m.uploadedBy?.name ?? "", uploadedByEmail: m.uploadedBy?.email ?? "",
  }));
}

async function fetchSettings() {
  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  return settings.map((s) => ({
    key: s.key, label: s.label, value: s.value,
    description: s.description ?? "", updatedAt: s.updatedAt.toISOString(),
  }));
}

async function fetchAuditLogs(from: string | null, to: string | null) {
  const createdAt = dateFilter(from, to);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    where: createdAt ? { createdAt } : undefined,
    select: {
      id: true, userId: true, userEmail: true,
      action: true, entity: true, entityId: true,
      metadata: true, createdAt: true,
    },
  });
  return logs.map((l) => ({
    id: l.id, userId: l.userId ?? "", userEmail: l.userEmail ?? "",
    action: l.action, entity: l.entity, entityId: l.entityId ?? "",
    metadata: l.metadata != null ? JSON.stringify(l.metadata) : "",
    createdAt: l.createdAt.toISOString(),
  }));
}

// ── Route ────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals)) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const entity = url.searchParams.get("entity");
  const format = url.searchParams.get("format") ?? "json";
  const from   = url.searchParams.get("from");
  const to     = url.searchParams.get("to");
  const date   = new Date().toISOString().slice(0, 10);

  const auditMeta = { format, ...(from ? { from } : {}), ...(to ? { to } : {}) };

  // ── Markdown ZIP: posts ──────────────────────────────────────────────────
  if (entity === "posts" && format === "md") {
    const posts = await fetchPostsRaw(from, to);
    const files: Record<string, Uint8Array> = {};
    for (const p of posts) {
      const md = `${postFrontmatter(p)}\n\n${p.content}`;
      files[`${p.slug}.md`] = new Uint8Array(Buffer.from(md, "utf-8"));
    }
    const zipped = zipSync(files);
    await logAudit(locals, "EXPORT", "posts", undefined, { ...auditMeta, records: posts.length });
    return new Response(zipped, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="devlog-posts-${date}.zip"`,
      },
    });
  }

  // ── Markdown ZIP: updates ────────────────────────────────────────────────
  if (entity === "updates" && format === "md") {
    const updates = await fetchUpdatesRaw(from, to);
    const files: Record<string, Uint8Array> = {};
    for (const u of updates) {
      const md = `${updateFrontmatter(u)}\n\n${u.content}`;
      files[`${u.slug}.md`] = new Uint8Array(Buffer.from(md, "utf-8"));
    }
    const zipped = zipSync(files);
    await logAudit(locals, "EXPORT", "updates", undefined, { ...auditMeta, records: updates.length });
    return new Response(zipped, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="devlog-updates-${date}.zip"`,
      },
    });
  }

  // ── Full backup ──────────────────────────────────────────────────────────
  if (entity === "all") {
    const [posts, updates, users, comments, tags, reactions, media, settings, auditLogs] =
      await Promise.all([
        fetchPosts(from, to), fetchUpdates(from, to), fetchUsers(from, to),
        fetchComments(from, to), fetchTags(), fetchReactions(from, to),
        fetchMedia(from, to), fetchSettings(), fetchAuditLogs(from, to),
      ]);
    const backup = {
      exportedAt: new Date().toISOString(),
      ...(from || to ? { filteredFrom: from ?? null, filteredTo: to ?? null } : {}),
      tables: { posts, updates, users, comments, tags, reactions, media, settings, audit_logs: auditLogs },
    };
    const totalRecords = posts.length + updates.length + users.length + comments.length +
      tags.length + reactions.length + media.length + settings.length + auditLogs.length;
    await logAudit(locals, "EXPORT", "backup", undefined, { ...auditMeta, records: totalRecords });
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="devlog-backup-${date}.json"`,
      },
    });
  }

  // ── Per-entity ───────────────────────────────────────────────────────────
  type FetchFn = () => Promise<Record<string, unknown>[]>;
  const fetchers: Record<string, FetchFn> = {
    posts:      () => fetchPosts(from, to),
    updates:    () => fetchUpdates(from, to),
    users:      () => fetchUsers(from, to),
    comments:   () => fetchComments(from, to),
    tags:       fetchTags,
    reactions:  () => fetchReactions(from, to),
    media:      () => fetchMedia(from, to),
    settings:   fetchSettings,
    audit_logs: () => fetchAuditLogs(from, to),
  };

  if (!entity || !(entity in fetchers)) {
    const valid = [...Object.keys(fetchers), "all"].join(", ");
    return new Response(JSON.stringify({ error: `entity debe ser: ${valid}` }), { status: 400 });
  }

  const rows = await fetchers[entity]();
  await logAudit(locals, "EXPORT", entity, undefined, { ...auditMeta, records: rows.length });

  if (format === "csv") {
    return new Response(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="devlog-${entity}-${date}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify(rows, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="devlog-${entity}-${date}.json"`,
    },
  });
};
