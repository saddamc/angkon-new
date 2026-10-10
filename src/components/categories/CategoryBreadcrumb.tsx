import Link from "next/link";
import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName } from "@/utils/category-display";

export function CategoryBreadcrumb({ path }: { path: CategoryNode[] }) {
  const href = (index: number) => "/" + path.slice(0, index + 1).map((c) => c.slug).join("/");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[#7a7a7a] flex-wrap font-normal">
      <Link href="/" className="transition hover:text-black">
        Home
      </Link>
      {path.map((node, index) => {
        const isLast = index === path.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1.5">
            <span className="text-[#a0a0a0] font-light">/</span>
            {isLast ? (
              <span className="text-[#555555] font-normal">{categoryDisplayName(node.name)}</span>
            ) : (
              <Link href={href(index)} className="transition hover:text-black">
                {categoryDisplayName(node.name)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

