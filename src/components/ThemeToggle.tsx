import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Sync initial state from DOM
    setIsDark(document.documentElement.classList.contains("dark"))

    // Watch for class changes (from the inline script or other page loads)
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains("dark")
    document.documentElement.classList[nextIsDark ? "add" : "remove"]("dark")
    localStorage.setItem("theme", nextIsDark ? "dark" : "light")
    setIsDark(nextIsDark)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary/30 border border-border/60 text-muted-foreground/80 hover:bg-secondary/50 hover:text-foreground modern-hover modern-scale-sm"
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-500 ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`}
      />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
