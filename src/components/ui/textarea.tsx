import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-slate-900 flex field-sizing-content min-h-16 w-full rounded-md border border-slate-700 px-3 py-2 text-base text-white shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-slate-700 focus-visible:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
