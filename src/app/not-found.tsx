import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-200">404</p>
      <h1 className="mt-2 font-display text-6xl uppercase">Page Not Found</h1>
      <p className="mt-3 max-w-md text-sm text-white/65">The jersey route you are looking for does not exist or has been moved.</p>
      <Button asChild className="mt-6" variant="accent">
        <Link href="/">Go Home</Link>
      </Button>
    </section>
  );
}
