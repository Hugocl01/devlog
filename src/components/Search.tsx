import { useEffect, useState, useRef } from "react";
import { Search as SearchIcon, Command, X, Loader2, FileText, ChevronRight, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    excerpt: string;
    filters: Record<string, any>;
    meta: {
      title: string;
      image?: string;
    };
    sub_results: any[];
  }>;
}

interface SearchResponse {
  results: PagefindResult[];
}

export const Search = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const pagefindRef = useRef<any>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMac(userAgent.includes('mac'));

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      loadPagefind();
      setSelectedIndex(-1);
    }
  }, [open]);

  const loadPagefind = async () => {
    if (pagefindRef.current) return;

    if (import.meta.env.DEV) {
      console.warn("Pagefind search is not available in development mode.");
      return;
    }

    try {
      const prefix = "/";
      const pagefindPath = `${prefix}pagefind/pagefind.js`;
      pagefindRef.current = await import(/* @vite-ignore */ pagefindPath);
      await pagefindRef.current.init();
    } catch (e) {
      console.error("Failed to load pagefind", e);
    }
  };

  useEffect(() => {
    const search = async () => {
      if (!query || !pagefindRef.current) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResponse: SearchResponse = await pagefindRef.current.search(query);
        const limitedResults = searchResponse.results.slice(0, 10);
        const detailedResults = await Promise.all(
          limitedResults.map((result) => result.data())
        );
        setResults(detailedResults);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(search, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center justify-center sm:justify-start gap-2 h-9 w-9 sm:w-auto sm:px-3 sm:py-1.5 text-sm font-medium text-muted-foreground/80 border border-border/60 rounded-full bg-secondary/30 hover:text-foreground modern-scale-sm modern-hover"
        aria-label="Abrir buscador"
      >
        <SearchIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline-block whitespace-nowrap">Buscar...</span>
        <Kbd className="hidden md:flex opacity-60 group-hover:opacity-100 transition-opacity">
          {isMac ? <Command className="h-2.5 w-2.5" /> : "Ctrl"} K
        </Kbd>
      </button>

      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) setQuery("");
      }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] sm:max-w-[700px] p-0 gap-0 overflow-hidden bg-card/40 backdrop-blur-md border-border/50 shadow-modern animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 rounded-2xl sm:top-[100px] sm:translate-y-0 sm:origin-top flex flex-col max-h-[85vh] sm:max-h-[800px]">
          <div className="relative group/input p-5 border-b border-border/50 bg-gradient-to-b from-transparent to-primary/5">
            <div className="absolute inset-y-0 left-9 flex items-center pointer-events-none">
              <SearchIcon className={cn(
                "h-5 w-5 transition-colors duration-300",
                query ? "text-primary shadow-primary/20" : "text-muted-foreground/40"
              )} />
            </div>
            <Input
              placeholder="Explora artículos, guías y más..."
              className="w-full h-12 pl-12 pr-12 text-lg bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/50 border border-border/60 focus:border-primary/50 rounded-full outline-none transition-all duration-300 focus:ring-4 focus:ring-primary/5 hover:shadow-lg hover:shadow-primary/5 focus:shadow-lg focus:shadow-primary/5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter" && selectedIndex >= 0) {
                  e.preventDefault();
                  window.location.href = results[selectedIndex].url;
                }
              }}
              autoFocus
            />
            <div className="absolute inset-y-0 right-9 flex items-center gap-2">
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary/60" />}
              {query && !isLoading && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1.5 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground/60 hover:text-foreground"
                  aria-label="Borrar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[320px] sm:h-[500px] w-full p-3">
            {!query && (
              <div className="py-20 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-primary/5 rounded-full border border-primary/10 flex items-center justify-center mb-6 shadow-modern shadow-primary/5">
                  <SearchIcon className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground/90 dark:text-foreground/80 tracking-tight">Búsqueda Instantánea</h3>
                <p className="text-foreground/70 dark:text-muted-foreground mt-2 max-w-[300px] text-sm leading-relaxed">
                  Encuentra exactamente lo que buscas en milisegundos.
                </p>
                {import.meta.env.DEV && (
                  <Badge variant="secondary" className="mt-6 px-3 py-1 bg-amber-500/10 text-amber-500 border-amber-500/20 rounded-full">
                    Modo Desarrollo: Índice disponible tras compilar
                  </Badge>
                )}
                <div className="hidden md:flex flex-wrap justify-center gap-6 mt-12 text-foreground/60 dark:text-muted-foreground/50 hover:text-foreground/90 dark:hover:text-muted-foreground transition-colors group/hints">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest">
                    <div className="flex gap-1.5 opacity-80 group-hover/hints:opacity-100 transition-opacity">
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd>
                    </div> Navegar
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest">
                    <Kbd className="text-[9px] px-1.5 py-0.5 opacity-80 group-hover/hints:opacity-100 transition-opacity">ESC</Kbd> Cerrar
                  </div>
                </div>
              </div>
            )}

            {query && results.length === 0 && !isLoading && (
              <div className="py-20 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/30 border border-border/60 text-foreground/40 dark:text-muted-foreground/60 mb-4">
                  <X className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold text-foreground/80 dark:text-foreground/60 italic">Sin resultados para "{query}"</p>
                <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-1">Prueba con otros términos de búsqueda.</p>
              </div>
            )}

            {results.length > 0 && (
              <div ref={resultsContainerRef} className="flex flex-col gap-2 p-1 w-full overflow-x-hidden">
                {results.map((result, index) => (
                  <a
                    key={result.url}
                    href={result.url}
                    className={cn(
                      "group relative w-full h-24 sm:h-[112px] p-2 sm:p-4 rounded-2xl transition-all duration-300 modern-hover modern-scale-lg overflow-hidden",
                      "grid grid-cols-[80px_minmax(0,1fr)] sm:grid-cols-[128px_minmax(0,1fr)] items-center gap-3 sm:gap-4",
                      selectedIndex === index
                        ? "bg-primary/[0.12] border-primary/40 shadow-lg shadow-primary/5"
                        : "bg-secondary/5 border-border/10 hover:bg-primary/[0.08] hover:border-primary/40"
                    )}
                  >
                    <div className="relative h-20 w-20 sm:h-auto sm:aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border/40 shadow-sm group-hover:shadow-md transition-all duration-500 group-hover:scale-[1.02]">
                      {result.meta.image ? (
                        <img
                          src={result.meta.image}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className={cn(
                          "h-full w-full flex items-center justify-center bg-gradient-to-br transition-colors duration-500",
                          result.url.includes("/blog/")
                            ? "from-blue-500/10 to-indigo-500/10 text-blue-500/40 opacity-80"
                            : "from-purple-500/10 to-pink-500/10 text-purple-500/40 opacity-80"
                        )}>
                          {result.url.includes("/blog/") ? (
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
                          ) : (
                            <Tag className="h-6 w-6 sm:h-8 sm:w-8" />
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500" />
                    </div>

                    <div className="h-full w-full flex flex-col justify-center min-w-0 pr-8 sm:pr-12">
                      <div className="flex items-center gap-2 mb-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] sm:text-[10px] uppercase tracking-tighter h-4 px-1.5 bg-background/50 border-border/60 font-bold transition-colors",
                            result.url.includes("/blog/")
                              ? "group-hover:border-blue-500/50 group-hover:text-blue-500"
                              : "group-hover:border-purple-500/50 group-hover:text-purple-500"
                          )}
                        >
                          {result.url.includes("/blog/") ? "Post" : "Etiqueta"}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate w-full shrink-0">
                        {result.meta.title}
                      </h3>
                      <div
                        className="text-xs text-foreground/70 dark:text-muted-foreground group-hover:text-foreground/90 dark:group-hover:text-muted-foreground/90 line-clamp-2 mt-1 leading-snug transition-colors break-words"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    </div>

                    <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:flex items-center justify-center pointer-events-none">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="px-5 py-4 border-t border-border/50 bg-secondary/20 backdrop-blur-md flex justify-between items-center text-[10px] text-foreground/70 dark:text-muted-foreground font-bold uppercase tracking-widest leading-none">
            <div className="flex items-center gap-1.5 grayscale opacity-90 dark:opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Búsqueda de DevLog
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:flex flex items-center gap-1.5 text-foreground/60 dark:text-muted-foreground/60 hover:text-foreground/90 dark:hover:text-foreground transition-colors cursor-default">
                <Kbd className="opacity-80">ESC</Kbd> Cerrar
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
