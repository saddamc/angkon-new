import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-full border border-[#5c0f0d] bg-[#2b0403] px-4 py-2 text-sm text-white placeholder:text-[#cbb18a]/60 focus-visible:outline-none focus-visible:border-[#E1B76F] focus-visible:ring-1 focus-visible:ring-[#E1B76F]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
