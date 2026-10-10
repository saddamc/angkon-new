import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName } from "@/utils/category-display";

export function CategoryBreadcrumb({ path }: { path: CategoryNode[] }) {
  const href = (index: number) => "/" + path.slice(0, index + 1).map((c) => c.slug).join("/");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[#cbb18a]">
      <Link href="/" className="transition hover:text-[#E1B76F]">
        Home
      </Link>
      {path.map((node, index) => {
        const isLast = index === path.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#cbb18a]/50" />
            {isLast ? (
              <span className="font-semibold text-[#E1B76F]">{categoryDisplayName(node.name)}</span>
            ) : (
              <Link href={href(index)} className="transition hover:text-[#E1B76F]">
                {categoryDisplayName(node.name)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
