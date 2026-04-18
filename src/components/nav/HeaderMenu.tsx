import { useState } from "react"
import { Menu } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface HeaderMenuItem {
    name: string
    href: string
}

export interface HeaderMenuProps {
    items: HeaderMenuItem[]
}

export default function HeaderMenu({ items }: HeaderMenuProps) {
    const [open, setOpen] = useState(false)

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
                                    <a href={item.href} aria-label={item.name}>{item.name}</a>
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
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    )
}