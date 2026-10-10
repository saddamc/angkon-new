export type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  thumbnail: string;
};

export const heroSlides: HeroSlide[] = [
  {
    id: 0,
    title: "Home Kit",
    subtitle: "Built for match-day presence",
    image:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=400&q=70",
  },
  {
    id: 1,
    title: "Away Kit",
    subtitle: "Clean lines, sharp contrast",
    image:
      "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1600&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=400&q=70",
  },
  {
    id: 2,
    title: "Third Kit",
    subtitle: "Limited edition energy",
    image:
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=400&q=70",
  },
  {
    id: 3,
    title: "National Pride",
    subtitle: "Iconic colors, premium fit",
    image:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1600&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=400&q=70",
  },
];