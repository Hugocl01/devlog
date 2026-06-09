import { useState, useEffect } from "react";
import { getCurrentUser, type ClientUser } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReactionItem {
  id: number;
  name: string;
  emoji: string;
  label: string;
  count: number;
  userReacted: boolean;
}

interface Props {
  postSlug: string;
}

export default function ReactionsBar({ postSlug }: Props) {
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${postSlug}/reactions`).then((r) => r.json()),
      getCurrentUser(),
    ]).then(([data, u]) => {
      setReactions(data.reactions ?? []);
      setUser(u);
      setLoading(false);
    });
  }, [postSlug]);

  const toggle = async (typeId: number) => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }
    if (pending !== null) return;

    setPending(typeId);

    // Optimistic update
    setReactions((prev) =>
      prev.map((r) =>
        r.id === typeId
          ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
          : r
      )
    );

    try {
      const res = await fetch(`/api/posts/${postSlug}/reactions`, { signal: AbortSignal.timeout(8000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions);
      } else {
        // Revert optimistic update and notify user
        setReactions((prev) =>
          prev.map((r) =>
            r.id === typeId
              ? { ...r, count: r.userReacted ? r.count + 1 : r.count - 1, userReacted: !r.userReacted }
              : r
          )
        );
        toast.error("No se pudo registrar la reacción", { description: "Inténtalo de nuevo.", duration: 3000 });
      }
    } catch {
      setReactions((prev) =>
        prev.map((r) =>
          r.id === typeId
            ? { ...r, count: r.userReacted ? r.count + 1 : r.count - 1, userReacted: !r.userReacted }
            : r
        )
      );
      toast.error("Error de conexión", { description: "Comprueba tu conexión a internet.", duration: 3000 });
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-8 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-16 rounded-full bg-secondary/30 border border-border/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!reactions.length) return null;

  return (
    <div className="max-w-3xl mx-auto mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
      <p className="text-sm text-muted-foreground mb-3">
        {user ? "¿Qué te ha parecido?" : "Inicia sesión para reaccionar"}
      </p>
      <div className="flex flex-wrap gap-2">
        {reactions.map((r) => (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            disabled={pending !== null}
            title={r.label}
            aria-label={`${r.label}${r.count > 0 ? ` · ${r.count}` : ""}`}
            aria-pressed={r.userReacted}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 select-none",
              "hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
              r.userReacted
                ? "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border"
            )}
          >
            <span className="text-base leading-none">{r.emoji}</span>
            {r.count > 0 && (
              <span className={cn("tabular-nums", r.userReacted ? "text-primary" : "")}>
                {r.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
