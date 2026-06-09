import { useState, useEffect } from "react"
import { Menu, LogIn, LogOut } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getCurrentUser, clearUserCache, type ClientUser } from "@/lib/auth-client"

export interface HeaderMenuItem {
    name: string
    href: string
}

export interface HeaderMenuProps {
    items: HeaderMenuItem[]
}

export default function HeaderMenu({ items }: HeaderMenuProps) {
    const [open, setOpen] = useState(false)
    const [user, setUser] = useState<ClientUser | null>(null)

    useEffect(() => {
        getCurrentUser().then(setUser)
    }, [])

    const handleLogout = async () => {
        clearUserCache()
        await fetch("/api/auth/logout", { method: "POST" })
        window.location.href = "/blog"
    }

    const initials = user
        ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : ""

    return (
        <>
            {/* DESKTOP */}
            <div className="hidden md:flex">
                <NavigationMenu>
                    <NavigationMenuList className="flex gap-2">
                        {items.map((item) => (
                            <NavigationMenuItem key={item.href}>
                                <NavigationMenuLink
                                    asChild
                                    className={cn(
                                        "group flex items-center px-4 py-1.5 text-sm font-medium text-muted-foreground/80 border border-transparent rounded-full hover:bg-secondary/30 hover:text-foreground modern-hover modern-scale-sm"
                                    )}
                                >
                                    <a href={item.href}>{item.name}</a>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>
            </div>

            {/* MOBILE */}
            <div className="md:hidden flex">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/30 border border-border/60 text-muted-foreground/80 hover:bg-secondary/50 hover:text-foreground modern-hover modern-scale-sm"
                            aria-label="Abrir menú de navegación"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>

                    <SheetContent side="top">
                        <div className="flex flex-col gap-4 mt-10 mb-4 mx-4">
                            {items.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    aria-label={item.name}
                                    className="text-lg font-medium text-foreground/80 hover:text-foreground transition"
                                    onClick={() => setOpen(false)}
                                >
                                    {item.name}
                                </a>
                            ))}

                            <div className="border-t border-border/40 pt-4 mt-2">
                                {user ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar size="default">
                                                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                                                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{user.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Cerrar sesión
                                        </button>
                                    </div>
                                ) : (
                                    <a
                                        href="/auth/login"
                                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                                        onClick={() => setOpen(false)}
                                    >
                                        <LogIn className="h-4 w-4" />
                                        Acceder
                                    </a>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    )
}
