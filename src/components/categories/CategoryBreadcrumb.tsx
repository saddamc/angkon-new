import Link from "next/link";
import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName } from "@/utils/category-display";

export function CategoryBreadcrumb({
  path,
  basePrefix = "",
}: {
  path: CategoryNode[];
  basePrefix?: string;
}) {
  const prefix = basePrefix ? basePrefix : "";
  const href = (index: number) => prefix + "/" + path.slice(0, index + 1).map((c) => c.slug).join("/");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] sm:text-[14px] text-[#777777] flex-wrap font-normal">
      <Link href="/" className="transition hover:text-[#333333]">
        Home
      </Link>
      {path.map((node, index) => {
        const isLast = index === path.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1.5">
            <span className="text-[#a0a0a0] font-light">/</span>
            {isLast ? (
              <span className="text-[#777777] font-normal">{categoryDisplayName(node.name)}</span>
            ) : (
              <Link href={href(index)} className="transition hover:text-[#333333]">
                {categoryDisplayName(node.name)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

