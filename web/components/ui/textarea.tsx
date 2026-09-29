import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[104px] w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm leading-5 outline-none resize-y placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary focus-visible:shadow-[inset_0_0_0_1px_var(--primary)] focus-visible:ring-[3px] focus-visible:ring-accent aria-invalid:border-destructive aria-invalid:shadow-none aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
