import { useState } from "react";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from "@/components/ui/item";

import { Badge } from "@/components/ui/badge";
import { Search, SearchX, ChevronRight, X } from "lucide-react";

import { tagUrl } from "@/utils/tag";

interface TagSearchProps {
    tags: [string, number][];
}

export default function TagSearch({ tags }: TagSearchProps) {
    const [query, setQuery] = useState("");

    const filtered = tags.filter(([tag]) =>
        tag.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="relative group reveal">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 transition-colors duration-300 ${query ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                <input
                    type="text"
                    placeholder="Buscar etiquetas..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-12 text-sm font-medium bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/50 border border-border/60 focus:border-primary/50 rounded-full outline-none transition-all duration-300 focus:ring-4 focus:ring-primary/5 modern-hover"
                />
                <div className="absolute inset-y-0 right-4 flex items-center">
                    {query && (
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

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(([tag, count], index) => (
                        <a
                            key={tag}
                            href={`/tags/${tagUrl(tag)}`}
                            className={`reveal stagger-${(index % 5) + 1} group relative flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden modern-scale-lg modern-hover hover:border-primary/40 active:border-primary/60`}
                        >
                            <ItemContent className="flex-row items-center gap-3">
                                <ItemTitle className="text-base font-bold group-hover:text-primary transition-colors">{tag}</ItemTitle>
                                <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-primary/10 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                    {count} {count === 1 ? "post" : "posts"}
                                </Badge>
                            </ItemContent>
                            <ItemActions className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                                <ChevronRight className="size-4 text-primary" />
                            </ItemActions>
                        </a>
                    ))}
                </div>
            ) : (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <SearchX />
                        </EmptyMedia>
                        <EmptyTitle>Sin resultados</EmptyTitle>
                        <EmptyDescription>
                            No hay etiquetas que coincidan con tu búsqueda "{query}".
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    );
}