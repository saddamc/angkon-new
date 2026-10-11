"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  DEFAULT_RECENTLY_VIEWED,
  getRecentlyViewed,
  formatRecentlyViewedPrice,
  type RecentlyViewedProduct,
} from "@/utils/recently-viewed";

interface CategorySidebarProps {
  isMobile?: boolean;
}

export function CategorySidebar({ isMobile = false }: CategorySidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentItems, setRecentItems] = useState<RecentlyViewedProduct[]>(DEFAULT_RECENTLY_VIEWED);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
    setRecentItems(getRecentlyViewed());
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className={`w-full ${isMobile ? "max-w-3xl" : ""}`}>
      {/* Search Widget */}
      <div className="mb-6 sm:mb-8">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative flex items-center border border-[#E1B76F]/30 rounded-lg bg-[#340402] overflow-hidden transition-colors focus-within:border-[#E1B76F]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full px-3.5 py-2.5 text-[14px] text-[#E1B76F] placeholder:text-[#E1B76F]/40 bg-transparent outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="bg-[#400604] hover:bg-[#520805] text-[#E1B76F] px-4 py-2.5 transition flex items-center justify-center flex-shrink-0 cursor-pointer border-l border-[#E1B76F]/20"
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>

      {/* Recently Viewed Products Widget */}
      <div>
        <h2 className="text-[20px] sm:text-[22px] md:text-[23px] font-heading font-bold text-[#E1B76F] leading-tight mb-4 sm:mb-5">
          Recently Viewed Products
        </h2>

        {recentItems.length === 0 ? (
          <p className="text-sm text-[#E1B76F]/60">No recently viewed products.</p>
        ) : (
          <ul
            className={
              isMobile
                ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                : "space-y-4"
            }
          >
            {recentItems.map((item) => (
              <li key={`${item.id}-${item.slug}`} className="flex items-start gap-3 group">
                {/* Thumbnail */}
                <Link
                  href={item.permalink}
                  className="relative w-14 h-14 sm:w-[60px] sm:h-[60px] flex-shrink-0 rounded-lg overflow-hidden bg-[#340402] border border-[#E1B76F]/25"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="60px"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={item.permalink}
                    className="block text-[13px] text-[#f0d29d] group-hover:text-[#E1B76F] leading-snug line-clamp-3 transition-colors font-medium"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-1 text-[13px] text-[#E1B76F] font-bold">
                    {formatRecentlyViewedPrice(item.price)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
