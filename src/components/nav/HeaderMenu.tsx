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
                                    className={navigationMenuTriggerStyle()}
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
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>

                    <SheetContent side="top">
                        <div className="flex flex-col gap-4 mt-10 mb-4 mx-4">
                            {items.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
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