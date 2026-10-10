export const formatPrice = (value: number | string) => {
  const amount = typeof value === "number" ? value : Number(value || 0);

  return `৳${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
};

export const getDisplayPrice = (regularPrice: string, salePrice: string) => {
  const sale = Number(salePrice || 0);
  const regular = Number(regularPrice || 0);

  return {
    regular,
    sale,
    hasSale: sale > 0 && sale < regular,
    current: sale > 0 ? sale : regular,
  };
};
