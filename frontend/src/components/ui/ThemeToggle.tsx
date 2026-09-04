import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "../../contexts/ThemeProvider"
import { cn } from "../../lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      className="relative flex items-center bg-foreground/5 border border-foreground/10 rounded-full p-1 cursor-pointer transition-colors hover:bg-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {/* Sliding Highlight */}
      <div
        className={cn(
          "absolute left-1 top-1 bottom-1 w-[28px] rounded-full bg-background shadow-sm border border-foreground/5 transition-transform duration-300 ease-out",
          isDark ? "translate-x-[28px]" : "translate-x-0"
        )}
      />
      
      {/* Light Icon */}
      <div className="relative z-10 flex items-center justify-center w-7 h-6">
        <Sun className={cn("w-4 h-4 shrink-0 transition-colors duration-300", isDark ? "text-muted-foreground" : "text-foreground")} />
      </div>
      
      {/* Dark Icon */}
      <div className="relative z-10 flex items-center justify-center w-7 h-6">
        <Moon className={cn("w-4 h-4 shrink-0 transition-colors duration-300", isDark ? "text-foreground" : "text-muted-foreground")} />
      </div>
    </button>
  )
}
