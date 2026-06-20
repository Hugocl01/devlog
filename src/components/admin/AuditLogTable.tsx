import { useState, useRef } from "react";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Search, X,
  FilePlus, FilePen, Trash2, Eye, EyeOff, Shield, Image, Download,
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
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  q: string;
  actionFilter: string;
  entityFilter: string;
  allActions: string[];
  allEntities: string[];
  prevUrl: string | null;
  nextUrl: string | null;
  firstUrl: string | null;
  lastUrl: string | null;
}

type SortKey = "createdAt" | "action" | "entity" | "userEmail";
type SortDir = "asc" | "desc";

const ACTION_COLORS: Record<string, string> = {
  CREATE:    "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  UPDATE:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  DELETE:    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  PUBLISH:   "bg-primary/10 text-primary border-primary/20",
  UNPUBLISH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  EXPORT:    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE:    FilePlus,
  UPDATE:    FilePen,
  DELETE:    Trash2,
  PUBLISH:   Eye,
  UNPUBLISH: EyeOff,
  EXPORT:    Download,
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post:          FilePen,
  update:        FilePen,
  user:          Shield,
  tag:           Shield,
  comment:       FilePen,
  media:         Image,
  setting:       Shield,
  reaction_type: Shield,
  backup:        Download,
  posts:         Download,
  updates:       Download,
  users:         Download,
  comments:      Download,
  reactions:     Download,
  audit_logs:    Download,
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

const btnPag = "flex h-7 w-7 items-center justify-center rounded-md text-sm hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

export default function AuditLogTable({
  entries, total, page, pageCount, pageSize,
  q, actionFilter, entityFilter,
  allActions, allEntities,
  prevUrl, nextUrl, firstUrl, lastUrl,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const formRef = useRef<HTMLFormElement>(null);

  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "createdAt": cmp = a.createdAt.localeCompare(b.createdAt); break;
      case "action":    cmp = a.action.localeCompare(b.action); break;
      case "entity":    cmp = a.entity.localeCompare(b.entity); break;
      case "userEmail": cmp = (a.userEmail ?? "").localeCompare(b.userEmail ?? ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir(col === "createdAt" ? "desc" : "asc"); }
  };

  const hasFilters = q || actionFilter || entityFilter;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <>
      {/* Filtros — formulario GET */}
      <form ref={formRef} method="get" action="/admin/audit" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por usuario, entidad…"
            onKeyDown={(e) => e.key === "Enter" && formRef.current?.submit()}
            className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <Select
          defaultValue={actionFilter || "all"}
          onValueChange={(v) => {
            const el = formRef.current?.querySelector<HTMLInputElement>("[name=action]");
            if (el) el.value = v === "all" ? "" : v;
            formRef.current?.submit();
          }}
        >
          <SelectTrigger className="h-9 w-36 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todas las acciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {allActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name="action" defaultValue={actionFilter} />

        <Select
          defaultValue={entityFilter || "all"}
          onValueChange={(v) => {
            const el = formRef.current?.querySelector<HTMLInputElement>("[name=entity]");
            if (el) el.value = v === "all" ? "" : v;
            formRef.current?.submit();
          }}
        >
          <SelectTrigger className="h-9 w-36 border-border/60 bg-secondary/30 text-sm">
            <SelectValue placeholder="Todas las entidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {allEntities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name="entity" defaultValue={entityFilter} />

        <button type="submit" className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/30 px-3 h-9 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <Search className="h-3.5 w-3.5" /> Buscar
        </button>

        {hasFilters && (
          <a
            href="/admin/audit"
            className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </a>
        )}

        <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
          {total.toLocaleString("es")} registros
        </span>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              <SortHeader label="Fecha"   col="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Acción"  col="action"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Entidad" col="entity"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">ID / Referencia</th>
              <SortHeader label="Usuario" col="userEmail" current={sortKey} dir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {hasFilters ? "Ningún registro coincide con los filtros." : "No hay registros de auditoría."}
                </td>
              </tr>
            ) : sorted.map((entry) => {
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
                    {entry.entityId
                      ? <span className="font-mono text-xs text-muted-foreground/70 truncate max-w-xs block">{entry.entityId}</span>
                      : <span className="text-xs text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {entry.userEmail ?? <span className="text-muted-foreground/40">Sistema</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Paginación */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
            <span>{from.toLocaleString("es")}–{to.toLocaleString("es")} de {total.toLocaleString("es")}</span>
            <div className="flex items-center gap-0.5">
              <a href={firstUrl ?? "#"} aria-disabled={!firstUrl} className={cn(btnPag, !firstUrl && "pointer-events-none opacity-40")}>«</a>
              <a href={prevUrl  ?? "#"} aria-disabled={!prevUrl}  className={cn(btnPag, !prevUrl  && "pointer-events-none opacity-40")}>‹</a>
              <span className="px-2.5 font-medium text-foreground tabular-nums">{page} / {pageCount}</span>
              <a href={nextUrl  ?? "#"} aria-disabled={!nextUrl}  className={cn(btnPag, !nextUrl  && "pointer-events-none opacity-40")}>›</a>
              <a href={lastUrl  ?? "#"} aria-disabled={!lastUrl}  className={cn(btnPag, !lastUrl  && "pointer-events-none opacity-40")}>»</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
