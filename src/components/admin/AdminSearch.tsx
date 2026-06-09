import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Zap, Users, Tag, X, Loader2, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "post" | "update" | "user" | "tag";
  id: string;
  label: string;
  sublabel: string;
  href: string;
  color?: string | null;
}

const TYPE_META = {
  post:   { icon: FileText, label: "Post",    color: "text-blue-500" },
  update: { icon: Zap,      label: "Update",  color: "text-purple-500" },
  user:   { icon: Users,    label: "Usuario", color: "text-green-500" },
  tag:    { icon: Tag,      label: "Tag",     color: "text-orange-500" },
};

export default function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setActiveIdx(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        if (!open) setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIdx]) {
      window.location.href = results[activeIdx].href;
    }
  };

  const close = () => { setOpen(false); setQuery(""); setResults([]); };

  return (
    <>
      {/* Trigger — misma estética que el Search del blog */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="group relative flex items-center justify-center sm:justify-start gap-2 h-9 w-9 sm:w-auto sm:px-3 sm:py-1.5 text-sm font-medium text-muted-foreground/80 border border-border/60 rounded-full bg-secondary/30 hover:text-foreground transition-colors"
        aria-label="Buscar en el panel"
      >
        <Search className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline-block whitespace-nowrap">Buscar...</span>
        <span className="hidden md:inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity rounded border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono">
          <Command className="h-2.5 w-2.5" /> K
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-100 flex items-start justify-center pt-16 px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={close} />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border/60 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4">
              {loading
                ? <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
                : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar posts, updates, usuarios, etiquetas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/50"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center rounded border border-border/50 bg-secondary/50 px-1.5 text-[10px] font-mono text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-2">
                {results.map((r, i) => {
                  const meta = TYPE_META[r.type];
                  const Icon = meta.icon;
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <a
                        href={r.href}
                        onClick={close}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          activeIdx === i ? "bg-secondary/50" : "hover:bg-secondary/30"
                        )}
                      >
                        <span className={cn("shrink-0", meta.color)}>
                          {r.type === "tag" && r.color
                            ? <span className="inline-block h-3.5 w-3.5 rounded-full border border-border/40" style={{ backgroundColor: r.color }} />
                            : <Icon className="h-3.5 w-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 rounded border border-border/40 px-1.5 py-0.5">
                          {meta.label}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}

            {query.trim().length >= 2 && !loading && results.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Sin resultados para "{query}"
              </div>
            )}

            {query.trim().length < 2 && !loading && (
              <div className="px-4 py-3 text-xs text-muted-foreground/60">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
