import { useState, useEffect } from "react";
import { LogIn } from "lucide-react";
import UserMenu from "./UserMenu";
import { getCurrentUser, type ClientUser } from "@/lib/auth-client";

export default function HeaderAuth() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="hidden sm:block h-8 w-24 rounded-full bg-secondary/30 border border-border/60 animate-pulse" />
    );
  }

  if (user) {
    return <UserMenu user={user} />;
  }

  return (
    <a
      href="/auth/login"
      className="hidden sm:inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-4 text-xs font-medium text-muted-foreground modern-hover modern-scale-sm hover:bg-secondary/50 hover:text-foreground hover:border-primary/50 transition-all"
      aria-label="Iniciar sesión"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span>Acceder</span>
    </a>
  );
}
