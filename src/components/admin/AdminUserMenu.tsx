import { useState, useRef, useEffect } from "react";
import { LogOut, UserCircle, ExternalLink, ChevronDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { clearUserCache } from "@/lib/auth-client";

interface Props {
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminUserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = getInitials(user.name);
  const firstName = user.name.split(" ")[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    clearUserCache();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-border/60 bg-secondary/30 pl-1 pr-3 text-xs font-medium text-muted-foreground modern-hover modern-scale-sm hover:bg-secondary/50 hover:text-foreground hover:border-primary/50 transition-all"
      >
        <Avatar size="sm">
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline-block max-w-24 truncate">{firstName}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/60 bg-card shadow-lg p-1 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40 mb-1">
            <Avatar size="default">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <a
            role="menuitem"
            href="/admin/profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <UserCircle className="h-3.5 w-3.5" />
            Mi perfil
          </a>

          <a
            role="menuitem"
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver blog
          </a>

          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
