import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-outline": "border border-destructive-border text-destructive hover:bg-destructive-soft",
        outline: "border border-input bg-card hover:bg-background",
        ink: "bg-ink text-ink-foreground hover:bg-ink/90",
        ghost: "hover:bg-muted",
        link: "text-primary hover:text-primary-hover px-1.5",
      },
      size: {
        default: "h-10 px-4",
        card: "h-11 px-4 text-[15px] [&_svg:not([class*='size-'])]:size-[17px]",
        lg: "h-12 rounded-[12px] px-5 text-[15px] [&_svg:not([class*='size-'])]:size-[17px]",
        sm: "h-8 rounded-[8px] px-3 text-[13px]",
        icon: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
