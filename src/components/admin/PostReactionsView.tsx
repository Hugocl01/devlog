import { useState, useMemo } from "react";
import { ArrowLeft, Search, X, ExternalLink } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReactionEntry {
  id: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  type: { id: number; emoji: string; label: string };
}

interface PostInfo {
  slug: string;
  title: string;
}

interface Props {
  post: PostInfo;
  reactions: ReactionEntry[];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function PostReactionsView({ post, reactions }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const reactionTypes = useMemo(() => {
    const seen = new Map<string, string>();
    reactions.forEach((r) => seen.set(r.type.label, r.type.emoji));
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [reactions]);

  // Summary counts per type
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    reactions.forEach((r) => map.set(r.type.label, (map.get(r.type.label) ?? 0) + 1));
    return map;
  }, [reactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return reactions.filter((r) => {
      const matchSearch = !q
        || r.user.name.toLowerCase().includes(q)
        || r.type.label.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || r.type.label === typeFilter;
      return matchSearch && matchType;
    });
  }, [reactions, search, typeFilter]);

  const hasFilters = search || typeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => { window.location.href = "/admin/posts"; }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a posts
      </button>

      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Reacciones del post</p>
          <h1 className="text-lg font-bold truncate">{post.title}</h1>
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
          >
            {post.slug}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {reactionTypes.map(([label, emoji]) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm"
            >
              <span>{emoji}</span>
              <span className="font-semibold tabular-nums">{typeCounts.get(label) ?? 0}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por usuario o tipo de reacción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="all">Todas las reacciones</option>
          {reactionTypes.map(([label, emoji]) => (
            <option key={label} value={label}>{emoji} {label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setTypeFilter("all"); }}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {reactions.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reacción</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ninguna reacción coincide con los filtros." : "No hay reacciones."}
                </td>
              </tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                <td className="px-4 py-3">
                  <a
                    href={`/admin/users/${r.user.id}`}
                    className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="size-7 shrink-0">
                      {r.user.avatar && <AvatarImage src={r.user.avatar} alt={r.user.name} />}
                      <AvatarFallback className={cn("bg-primary/10 text-primary text-xs font-bold")}>
                        {getInitials(r.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-primary hover:underline">
                      {r.user.name}
                    </span>
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/reaction-types/${r.type.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-secondary/40 px-3 py-1 text-sm hover:bg-secondary/70 transition-colors"
                  >
                    <span>{r.type.emoji}</span>
                    <span className="text-xs text-muted-foreground">{r.type.label}</span>
                  </a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                  {formatDateShort(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
