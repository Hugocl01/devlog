import { useState, useMemo } from "react";
import { ArrowLeft, ExternalLink, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReactionEntry {
  id: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  post: { slug: string; title: string };
}

interface ReactionTypeDetail {
  id: number;
  name: string;
  emoji: string;
  label: string;
  reactions: ReactionEntry[];
}

interface Props {
  type: ReactionTypeDetail;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type SortKey = "user" | "post" | "date";
type SortDir = "asc" | "desc";

function SortHeader({ label, col, current, dir, onSort, className }: {
  label: string; col: SortKey; current: SortKey; dir: SortDir;
  onSort: (c: SortKey) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap",
          active && "text-foreground"
        )}
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

export default function ReactionDetailView({ type }: Props) {
  const [search, setSearch] = useState("");
  const [postFilter, setPostFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir(col === "date" ? "desc" : "asc"); }
  };

  const posts = useMemo(() => {
    const map = new Map<string, string>();
    type.reactions.forEach((r) => map.set(r.post.slug, r.post.title));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [type.reactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return type.reactions.filter((r) => {
      const matchSearch = !q
        || r.user.name.toLowerCase().includes(q)
        || r.post.title.toLowerCase().includes(q);
      const matchPost = postFilter === "all" || r.post.slug === postFilter;
      return matchSearch && matchPost;
    });
  }, [type.reactions, search, postFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "user") cmp = a.user.name.localeCompare(b.user.name);
      else if (sortKey === "post") cmp = a.post.title.localeCompare(b.post.title);
      else cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const hasFilters = search || postFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => { window.location.href = "/admin/reaction-types"; }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a reacciones
      </button>

      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card p-6 flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/40 text-4xl">
          {type.emoji}
        </div>
        <div>
          <h1 className="text-xl font-bold">{type.label}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{type.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground tabular-nums">{type.reactions.length}</span>{" "}
            uso{type.reactions.length !== 1 ? "s" : ""} en total
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por usuario o post..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <select
          value={postFilter}
          onChange={(e) => setPostFilter(e.target.value)}
          className="h-9 max-w-64 rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="all">Todos los posts</option>
          {posts.map(([slug, title]) => (
            <option key={slug} value={slug}>{title}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setPostFilter("all"); }}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {type.reactions.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <SortHeader label="Usuario" col="user" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Post" col="post" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Fecha" col="date" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ninguna reacción coincide con los filtros." : "No hay reacciones."}
                </td>
              </tr>
            ) : sorted.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                <td className="px-4 py-3">
                  <a
                    href={`/admin/users/${r.user.id}`}
                    className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="size-7 shrink-0">
                      {r.user.avatar && <AvatarImage src={r.user.avatar} alt={r.user.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(r.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("text-sm font-medium text-primary hover:underline")}>
                      {r.user.name}
                    </span>
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/blog/${r.post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-xs"
                  >
                    {r.post.title}
                    <ExternalLink className="h-3 w-3 shrink-0" />
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
