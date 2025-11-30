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

import { SearchX, ChevronRight } from "lucide-react";

import { tagUrl } from "@/lib/tag";

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
            <input
                type="text"
                placeholder="Buscar etiquetas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(([tag, count]) => (
                        <Item variant={"outline"} key={tag} asChild>
                            <a href={`/tags/${tagUrl(tag)}`}>
                                <ItemContent>
                                    <ItemTitle>{tag}</ItemTitle>
                                    <ItemDescription>
                                        {count} {count === 1 ? "post" : "posts"}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <ChevronRight className="size-4" />
                                </ItemActions>
                            </a>
                        </Item>
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