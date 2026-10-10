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
      {/* Search Widget (Matches Gorur Ghash / Astra Sidebar Search) */}
      <div className="mb-6 sm:mb-8">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative flex items-center border border-[#dddddd] rounded-[2px] bg-white overflow-hidden transition-colors focus-within:border-[#999999]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full px-3 py-2 text-[14px] text-[#4e4e4e] placeholder:text-[#888888] bg-transparent outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="bg-[#222222] hover:bg-black text-white px-3.5 py-2.5 transition flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>

      {/* Recently Viewed Products Widget */}
      <div>
        <h2 className="text-[20px] sm:text-[22px] md:text-[23px] font-light text-[#333333] leading-tight mb-4 sm:mb-5">
          Recently Viewed Products
        </h2>

        {recentItems.length === 0 ? (
          <p className="text-sm text-[#777777]">No recently viewed products.</p>
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
                  className="relative w-14 h-14 sm:w-[60px] sm:h-[60px] flex-shrink-0 rounded-[2px] overflow-hidden bg-neutral-100 border border-[#e7e7e7]"
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
                    className="block text-[13px] text-[#4e4e4e] group-hover:text-black leading-snug line-clamp-3 transition-colors font-normal"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-1 text-[13px] text-[#4e4e4e] font-normal">
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
