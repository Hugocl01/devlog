import { useState } from "react";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Search, X,
  FilePlus, FilePen, Trash2, Eye, EyeOff, Shield, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface AuditEntry {
  id: number;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Props {
  entries: AuditEntry[];
}

type SortKey = "createdAt" | "action" | "entity" | "userEmail";
type SortDir = "asc" | "desc";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  UPDATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  PUBLISH: "bg-primary/10 text-primary border-primary/20",
  UNPUBLISH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: FilePlus,
  UPDATE: FilePen,
  DELETE: Trash2,
  PUBLISH: Eye,
  UNPUBLISH: EyeOff,
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post: FilePen,
  update: FilePen,
  user: Shield,
  tag: Shield,
  comment: FilePen,
  media: Image,
  setting: Shield,
  reaction_type: Shield,
};

function SortHeader({ label, col, current, dir, onSort, className }: {
  label: string; col: SortKey; current: SortKey; dir: SortDir;
  onSort: (c: SortKey) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th className={cn("px-4 py-3 text-left font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(col)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap", active && "text-foreground")}
      >
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

const PAGE_SIZE = 30;

export default function AuditLogTable({ entries }: Props) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const allActions = [...new Set(entries.map((e) => e.action))].sort();
  const allEntities = [...new Set(entries.map((e) => e.entity))].sort();

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || e.userEmail?.toLowerCase().includes(q) || e.entityId?.toLowerCase().includes(q) || e.entity.toLowerCase().includes(q);
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    const matchEntity = entityFilter === "all" || e.entity === entityFilter;
    return matchSearch && matchAction && matchEntity;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "createdAt": cmp = a.createdAt.localeCompare(b.createdAt); break;
      case "action":    cmp = a.action.localeCompare(b.action); break;
      case "entity":    cmp = a.entity.localeCompare(b.entity); break;
      case "userEmail": cmp = (a.userEmail ?? "").localeCompare(b.userEmail ?? ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const from      = Math.min((safePage - 1) * PAGE_SIZE + 1, sorted.length || 1);
  const to        = Math.min(safePage * PAGE_SIZE, sorted.length);
  const paginated = sorted.slice(from - 1, to);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir(col === "createdAt" ? "desc" : "asc"); }
    setPage(1);
  };

  const hasFilters = search || actionFilter !== "all" || entityFilter !== "all";
  const btnPag = "flex h-7 w-7 items-center justify-center rounded-md text-sm hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Buscar por usuario, entidad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todas las acciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {allActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todas las entidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {allEntities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setActionFilter("all"); setEntityFilter("all"); setPage(1); }}
            className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {filtered.length} / {entries.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <SortHeader label="Fecha" col="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Acción" col="action" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Entidad" col="entity" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">ID / Referencia</th>
              <SortHeader label="Usuario" col="userEmail" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ningún registro coincide con los filtros." : "No hay registros de auditoría."}
                </td>
              </tr>
            ) : paginated.map((entry) => {
              const ActionIcon = ACTION_ICONS[entry.action] ?? FilePen;
              const EntityIcon = ENTITY_ICONS[entry.entity] ?? Shield;
              const actionColor = ACTION_COLORS[entry.action] ?? "bg-secondary/50 text-muted-foreground border-border/40";
              return (
                <tr key={entry.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("es-ES", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", actionColor)}>
                      <ActionIcon className="h-3 w-3" />
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <EntityIcon className="h-3.5 w-3.5 shrink-0" />
                      {entry.entity}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {entry.entityId ? (
                      <span className="font-mono text-xs text-muted-foreground/70 truncate max-w-xs block">{entry.entityId}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {entry.userEmail ?? <span className="text-muted-foreground/40">Sistema</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
            <span>{from}–{to} de {sorted.length}</span>
            <div className="flex items-center gap-0.5">
              <button className={btnPag} disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
              <button className={btnPag} disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              <span className="px-2.5 font-medium text-foreground tabular-nums">{safePage} / {pageCount}</span>
              <button className={btnPag} disabled={safePage === pageCount} onClick={() => setPage((p) => p + 1)}>›</button>
              <button className={btnPag} disabled={safePage === pageCount} onClick={() => setPage(pageCount)}>»</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
