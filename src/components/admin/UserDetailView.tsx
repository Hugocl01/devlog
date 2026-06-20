import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Shield, CheckCircle2, XCircle, MessageSquare,
  Heart, Monitor, Trash2, ExternalLink, Search, X, Reply, CalendarDays,
  ShieldOff, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";

interface CommentEntry {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  banned: boolean;
  post: { slug: string; title: string };
  parent: { content: string; user: { name: string } } | null;
}

interface ReactionEntry {
  id: string;
  createdAt: string;
  post: { slug: string; title: string };
  type: { emoji: string; label: string };
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  roleId: number;
  emailVerified: boolean;
  createdAt: string;
  role: { name: string };
  comments: CommentEntry[];
  reactions: ReactionEntry[];
  _count: { sessions: number };
}

interface Props {
  user: UserDetail;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function StatCard({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: number; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3",
      highlight && "border-primary/20 bg-primary/5"
    )}>
      <div className={cn("rounded-lg p-2 bg-secondary/30", highlight && "bg-primary/10 text-primary")}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums", highlight && "text-primary")}>{value}</p>
      </div>
    </div>
  );
}

export default function UserDetailView({ user }: Props) {
  const [comments, setComments] = useState(user.comments);
  const [activeTab, setActiveTab] = useState<"comments" | "reactions">("comments");

  // Comment filters
  const [commentSearch, setCommentSearch] = useState("");
  const [commentPostFilter, setCommentPostFilter] = useState("all");
  const [commentTypeFilter, setCommentTypeFilter] = useState("all");

  // Reaction filters
  const [reactionSearch, setReactionSearch] = useState("");
  const [reactionPostFilter, setReactionPostFilter] = useState("all");
  const [reactionTypeFilter, setReactionTypeFilter] = useState("all");

  // Ban
  const [togglingBan, setTogglingBan] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const commentPosts = useMemo(() => {
    const map = new Map<string, string>();
    comments.forEach((c) => map.set(c.post.slug, c.post.title));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [comments]);
  const reactionPosts = useMemo(() => {
    const map = new Map<string, string>();
    user.reactions.forEach((r) => map.set(r.post.slug, r.post.title));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [user.reactions]);
  const reactionTypes = useMemo(() => {
    const seen = new Map<string, string>();
    user.reactions.forEach((r) => seen.set(r.type.label, r.type.emoji));
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [user.reactions]);

  const filteredComments = useMemo(() => {
    const q = commentSearch.toLowerCase().trim();
    return comments.filter((c) => {
      const matchSearch = !q || c.content.toLowerCase().includes(q) || c.post.title.toLowerCase().includes(q);
      const matchPost = commentPostFilter === "all" || c.post.slug === commentPostFilter;
      const matchType =
        commentTypeFilter === "all" ||
        (commentTypeFilter === "reply" ? c.parentId !== null : c.parentId === null);
      return matchSearch && matchPost && matchType;
    });
  }, [comments, commentSearch, commentPostFilter, commentTypeFilter]);

  const filteredReactions = useMemo(() => {
    const q = reactionSearch.toLowerCase().trim();
    return user.reactions.filter((r) => {
      const matchSearch = !q || r.post.title.toLowerCase().includes(q) || r.type.label.toLowerCase().includes(q);
      const matchPost = reactionPostFilter === "all" || r.post.slug === reactionPostFilter;
      const matchType = reactionTypeFilter === "all" || r.type.label === reactionTypeFilter;
      return matchSearch && matchPost && matchType;
    });
  }, [user.reactions, reactionSearch, reactionPostFilter, reactionTypeFilter]);

  const toggleBan = async (id: string, currentBanned: boolean) => {
    setTogglingBan(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !currentBanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, banned: !currentBanned } : c));
      toast.success(currentBanned ? "Comentario restaurado" : "Comentario baneado", {
        description: currentBanned ? "Ya es visible públicamente." : "Ocultado del blog.",
        duration: 3000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setTogglingBan(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success("Comentario eliminado", { duration: 2500 });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("No se pudo eliminar el comentario", { description: data.error });
      }
    } catch {
      toast.error("Error de conexión", { description: "No se pudo contactar con el servidor." });
    } finally {
      setDeleting(false);
    }
  };

  const hasCommentFilters = commentSearch || commentPostFilter !== "all" || commentTypeFilter !== "all";
  const hasReactionFilters = reactionSearch || reactionPostFilter !== "all" || reactionTypeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => { window.location.href = "/admin/users"; }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a usuarios
      </button>

      {/* Profile card */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <Avatar className="size-20 shrink-0">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{user.name}</h1>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                user.roleId === 2
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-secondary/50 text-muted-foreground border border-border/60"
              )}>
                {user.roleId === 2 && <Shield className="h-3 w-3" />}
                {user.role.name}
              </span>
              {user.emailVerified
                ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" />Verificado</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border/60"><XCircle className="h-3 w-3" />Sin verificar</span>
              }
            </div>

            <p className="text-sm text-muted-foreground mb-1">{user.email}</p>

            {user.bio && (
              <p className="text-sm text-foreground/80 mt-2 max-w-prose">{user.bio}</p>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Registrado el {formatDate(user.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Comentarios"
          value={comments.length}
        />
        <StatCard
          icon={<Heart className="h-4 w-4" />}
          label="Reacciones"
          value={user.reactions.length}
        />
        <StatCard
          icon={<Monitor className="h-4 w-4" />}
          label="Sesiones activas"
          value={user._count.sessions}
          highlight={user._count.sessions > 0}
        />
        <StatCard
          icon={<ExternalLink className="h-4 w-4" />}
          label="Posts comentados"
          value={new Set(comments.map((c) => c.post.slug)).size}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-card p-1 w-fit">
        {(["comments", "reactions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {tab === "comments" ? (
              <><MessageSquare className="h-4 w-4" />Comentarios <span className="tabular-nums">({comments.length})</span></>
            ) : (
              <><Heart className="h-4 w-4" />Reacciones <span className="tabular-nums">({user.reactions.length})</span></>
            )}
          </button>
        ))}
      </div>

      {/* Comments tab */}
      {activeTab === "comments" && (
        <div>
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
            <div className="relative flex-1 min-w-44">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="search"
                placeholder="Buscar por contenido o post..."
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
              />
            </div>

            <Select value={commentPostFilter} onValueChange={setCommentPostFilter}>
              <SelectTrigger className="h-9 max-w-52 border-border/60 bg-secondary/30 text-sm">
                <SelectValue placeholder="Todos los posts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los posts</SelectItem>
                {commentPosts.map(([slug, title]) => <SelectItem key={slug} value={slug}>{title}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={commentTypeFilter} onValueChange={setCommentTypeFilter}>
              <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="comment">Solo comentarios</SelectItem>
                <SelectItem value="reply">Solo respuestas</SelectItem>
              </SelectContent>
            </Select>

            {hasCommentFilters && (
              <button
                onClick={() => { setCommentSearch(""); setCommentPostFilter("all"); setCommentTypeFilter("all"); }}
                className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
              {filteredComments.length} / {comments.length}
            </span>
          </div>

          {comments.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-border/60">
              Este usuario no ha escrito ningún comentario.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentario</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Post</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredComments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        Ningún comentario coincide con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredComments.map((comment) => (
                      <tr
                        key={comment.id}
                        className={cn(
                          "transition-colors",
                          comment.banned ? "bg-orange-500/5 hover:bg-orange-500/10" : "hover:bg-secondary/10",
                          deleting && deleteTarget?.id === comment.id && "opacity-60"
                        )}
                      >
                        <td className="px-4 py-3 max-w-sm">
                          {comment.parent && (
                            <div className="mb-1 flex items-start gap-1 rounded-md bg-secondary/30 px-2 py-1">
                              <Reply className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                              <p className="truncate text-xs text-muted-foreground/70">
                                <span className="font-medium">{comment.parent.user.name}:</span>{" "}
                                {comment.parent.content}
                              </p>
                            </div>
                          )}
                          <p className={cn("truncate", comment.banned ? "text-muted-foreground/50 line-through" : "text-foreground/90")} title={comment.content}>
                            {comment.content}
                          </p>
                          {comment.banned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                              <ShieldOff className="h-2.5 w-2.5" /> baneado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <a
                            href={`/blog/${comment.post.slug}#comment-${comment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-xs"
                          >
                            {comment.post.title}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDateShort(comment.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleBan(comment.id, comment.banned)}
                              disabled={togglingBan === comment.id}
                              title={comment.banned ? "Restaurar comentario" : "Banear comentario"}
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                                comment.banned
                                  ? "text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20"
                                  : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                              )}
                            >
                              {comment.banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: comment.id })}
                              title="Eliminar comentario"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reactions tab */}
      {activeTab === "reactions" && (
        <div>
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
            <div className="relative flex-1 min-w-44">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="search"
                placeholder="Buscar por post o tipo..."
                value={reactionSearch}
                onChange={(e) => setReactionSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
              />
            </div>

            <Select value={reactionPostFilter} onValueChange={setReactionPostFilter}>
              <SelectTrigger className="h-9 max-w-52 border-border/60 bg-secondary/30 text-sm">
                <SelectValue placeholder="Todos los posts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los posts</SelectItem>
                {reactionPosts.map(([slug, title]) => <SelectItem key={slug} value={slug}>{title}</SelectItem>)}
              </SelectContent>
            </Select>

            {reactionTypes.length > 0 && (
              <Select value={reactionTypeFilter} onValueChange={setReactionTypeFilter}>
                <SelectTrigger className="h-9 border-border/60 bg-secondary/30 text-sm">
                  <SelectValue placeholder="Todas las reacciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las reacciones</SelectItem>
                  {reactionTypes.map(([label, emoji]) => (
                    <SelectItem key={label} value={label}>{emoji} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasReactionFilters && (
              <button
                onClick={() => { setReactionSearch(""); setReactionPostFilter("all"); setReactionTypeFilter("all"); }}
                className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-3 h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
              {filteredReactions.length} / {user.reactions.length}
            </span>
          </div>

          {user.reactions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-border/60">
              Este usuario no ha dejado ninguna reacción.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reacción</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Post</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredReactions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Ninguna reacción coincide con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredReactions.map((reaction) => (
                      <tr key={reaction.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-secondary/40 px-3 py-1 text-sm">
                            <span>{reaction.type.emoji}</span>
                            <span className="text-xs text-muted-foreground">{reaction.type.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/blog/${reaction.post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-xs"
                          >
                            {reaction.post.title}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDateShort(reaction.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar comentario"
        description="¿Seguro que quieres eliminar este comentario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar comentario"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
