import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-[15px] transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-subtle-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted",
        "focus-visible:border-primary focus-visible:shadow-[inset_0_0_0_1px_var(--primary)] focus-visible:ring-[3px] focus-visible:ring-accent",
        "aria-invalid:border-destructive aria-invalid:shadow-none aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
