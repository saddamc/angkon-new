"use client";

import { useCallback, useEffect, useState } from "react";
import { getProducts } from "@/services/products.service";
import type { WooProduct } from "@/types/product";

interface UseProductsOptions {
  search?: string;
  category?: string;
}

export const useProducts = ({ search, category }: UseProductsOptions = {}) => {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts({ search, category });
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void loadProducts();
  }, [loadProducts]);

  return { products, loading, error, reload: loadProducts };
};
