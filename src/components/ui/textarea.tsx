import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-2xl border border-[#6e101c] bg-[#3b050b] px-4 py-3 text-sm text-white placeholder:text-[#cbb18a]/60 focus-visible:outline-none focus-visible:border-[#E1B76F] focus-visible:ring-1 focus-visible:ring-[#E1B76F]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
